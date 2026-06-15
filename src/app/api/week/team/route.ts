import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect } from '@/lib/neynar';
import { currentWeekId, nextWeekId, weekBounds } from '@/lib/weeklyScoring';
import { awardPoints, upsertPlayer } from '@/lib/points';
import { PlayerTier } from '@/types/league';

// GET /api/week/team?ownerFid=123  OR  ?ownerDeviceId=abc
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');
  const weekId        = searchParams.get('weekId') ?? currentWeekId();

  try {
    const rows = ownerFid
      ? await sql`
          SELECT wt.*,
            ca.handle AS casts_handle,      ca.thumb_url AS casts_thumb,      ca.rarity AS casts_rarity,
            re.handle AS replies_handle,    re.thumb_url AS replies_thumb,    re.rarity AS replies_rarity,
            fo.handle AS followers_handle,  fo.thumb_url AS followers_thumb,  fo.rarity AS followers_rarity,
            sr.handle AS score_rise_handle, sr.thumb_url AS score_rise_thumb, sr.rarity AS score_rise_rarity,
            li.handle AS likes_handle,      li.thumb_url AS likes_thumb,      li.rarity AS likes_rarity
          FROM weekly_teams wt
          LEFT JOIN cards ca ON ca.fid = wt.casts_fid
          LEFT JOIN cards re ON re.fid = wt.replies_fid
          LEFT JOIN cards fo ON fo.fid = wt.followers_fid
          LEFT JOIN cards sr ON sr.fid = wt.score_rise_fid
          LEFT JOIN cards li ON li.fid = wt.likes_fid
          WHERE wt.week_id = ${weekId} AND wt.owner_fid = ${parseInt(ownerFid)}
        `
      : ownerDeviceId
      ? await sql`
          SELECT wt.*
          FROM weekly_teams wt
          WHERE wt.week_id = ${weekId} AND wt.owner_device_id = ${ownerDeviceId}
        `
      : [];

    const team = rows[0] ?? null;

    // Also return current player info
    const fid = ownerFid ? parseInt(ownerFid) : null;
    const device = ownerDeviceId ?? null;
    const playerRows = fid
      ? await sql`SELECT protocol_points, tier, locked_to_pro, referral_code FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT protocol_points, tier, locked_to_pro, referral_code FROM players WHERE owner_device_id = ${device}`;
    const player = playerRows[0] ?? null;

    const { start, end } = weekBounds(weekId);
    // Scoring fires at Monday 00:00 UTC (Sunday midnight UK time in winter)
    const endsAt = new Date(start.getTime() + 7 * 86400000).toISOString();

    return NextResponse.json({ team, weekId, endsAt, player });
  } catch {
    return NextResponse.json({ team: null, weekId, endsAt: null, player: null });
  }
}

// POST /api/week/team
// Body: { ownerFid?, ownerDeviceId?, castsFid, repliesFid, followersFid, scoreRiseFid, likesFid, chosenTier?, targetWeekId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ownerFid, ownerDeviceId,
      castsFid, repliesFid, followersFid, scoreRiseFid, likesFid,
      chosenTier = 'beginner',
      targetWeekId,
    } = body;

    if (!ownerFid && !ownerDeviceId) return NextResponse.json({ error: 'owner required' }, { status: 400 });

    const slotFids = [castsFid, repliesFid, followersFid, scoreRiseFid, likesFid] as number[];
    if (slotFids.some(f => !f)) return NextResponse.json({ error: 'all 5 slots required' }, { status: 400 });

    const fid    = ownerFid    ? parseInt(ownerFid)    : null;
    const device = ownerDeviceId ?? null;

    // Ensure player row exists
    await upsertPlayer(fid, device);

    // Validate tier choice against player's locked status
    const playerRows = fid
      ? await sql`SELECT tier, locked_to_pro FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT tier, locked_to_pro FROM players WHERE owner_device_id = ${device}`;

    const player = playerRows[0];
    const effectiveTier: PlayerTier = player?.locked_to_pro ? 'pro' : (chosenTier as PlayerTier);

    // Allow submitting for current or next week only
    const validWeeks = [currentWeekId(), nextWeekId()];
    const weekId = (targetWeekId && validWeeks.includes(targetWeekId)) ? targetWeekId : currentWeekId();
    const { start, end } = weekBounds(weekId);

    // Check if team already exists for this week (to avoid double-awarding team_lock)
    const existingTeam = fid
      ? await sql`SELECT id FROM weekly_teams WHERE week_id = ${weekId} AND owner_fid = ${fid}`
      : await sql`SELECT id FROM weekly_teams WHERE week_id = ${weekId} AND owner_device_id = ${device}`;
    const isNewTeam = existingTeam.length === 0;

    await sql`
      INSERT INTO weeks (id, starts_at, ends_at)
      VALUES (${weekId}, ${start.toISOString()}, ${end.toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;

    // Verify ownership of all 5 cards
    const owned = fid
      ? await sql`SELECT DISTINCT fid FROM owned_cards WHERE owner_fid = ${fid} AND fid = ANY(${slotFids}::int[])`
      : await sql`SELECT DISTINCT fid FROM owned_cards WHERE owner_device_id = ${device} AND fid = ANY(${slotFids}::int[])`;

    const ownedFids = new Set(owned.map(r => Number(r.fid)));
    const missing = slotFids.filter(f => !ownedFids.has(f));
    if (missing.length > 0) return NextResponse.json({ error: 'you do not own all selected cards' }, { status: 403 });

    // Fetch Neynar baselines for followers slot and score_rise slot
    const baselineFids = [...new Set([followersFid, scoreRiseFid])] as number[];
    const neynarMap = await fetchNeynarUsersDirect(baselineFids);
    const followersBaseline = neynarMap.get(followersFid)?.follower_count ?? 0;
    const scoreBaseline     = neynarMap.get(scoreRiseFid)?.score          ?? 0;

    // Avg team battle score (for tier ranking)
    const cardRows = await sql`
      SELECT fid, battle_score FROM cards WHERE fid = ANY(${slotFids}::int[])
    `;
    const avgTeamScore = cardRows.length > 0
      ? cardRows.reduce((s, r) => s + Number(r.battle_score), 0) / cardRows.length
      : 0;

    const upsertValues = {
      weekId, effectiveTier, castsFid, repliesFid, followersFid, scoreRiseFid, likesFid,
      followersBaseline, scoreBaseline, avgTeamScore,
    };

    if (fid) {
      await sql`
        INSERT INTO weekly_teams (
          week_id, owner_fid,
          casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
          chosen_tier, avg_team_score,
          followers_baseline, score_baseline,
          updated_at
        ) VALUES (
          ${weekId}, ${fid},
          ${castsFid}, ${repliesFid}, ${followersFid}, ${scoreRiseFid}, ${likesFid},
          ${effectiveTier}, ${avgTeamScore},
          ${followersBaseline}, ${scoreBaseline},
          NOW()
        )
        ON CONFLICT (week_id, owner_fid) DO UPDATE SET
          casts_fid          = EXCLUDED.casts_fid,
          replies_fid        = EXCLUDED.replies_fid,
          followers_fid      = EXCLUDED.followers_fid,
          score_rise_fid     = EXCLUDED.score_rise_fid,
          likes_fid          = EXCLUDED.likes_fid,
          chosen_tier        = EXCLUDED.chosen_tier,
          avg_team_score     = EXCLUDED.avg_team_score,
          followers_baseline = EXCLUDED.followers_baseline,
          score_baseline     = EXCLUDED.score_baseline,
          updated_at         = NOW()
      `;
    } else {
      await sql`
        INSERT INTO weekly_teams (
          week_id, owner_device_id,
          casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
          chosen_tier, avg_team_score,
          followers_baseline, score_baseline,
          updated_at
        ) VALUES (
          ${weekId}, ${device},
          ${castsFid}, ${repliesFid}, ${followersFid}, ${scoreRiseFid}, ${likesFid},
          ${effectiveTier}, ${avgTeamScore},
          ${followersBaseline}, ${scoreBaseline},
          NOW()
        )
        ON CONFLICT (week_id, owner_device_id) DO UPDATE SET
          casts_fid          = EXCLUDED.casts_fid,
          replies_fid        = EXCLUDED.replies_fid,
          followers_fid      = EXCLUDED.followers_fid,
          score_rise_fid     = EXCLUDED.score_rise_fid,
          likes_fid          = EXCLUDED.likes_fid,
          chosen_tier        = EXCLUDED.chosen_tier,
          avg_team_score     = EXCLUDED.avg_team_score,
          followers_baseline = EXCLUDED.followers_baseline,
          score_baseline     = EXCLUDED.score_baseline,
          updated_at         = NOW()
      `;
    }

    // Award team_lock points only on first submission (not re-saves)
    if (isNewTeam) {
      await awardPoints(fid, device, 'team_lock');
    }

    return NextResponse.json({ ok: true, weekId, chosenTier: effectiveTier });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
