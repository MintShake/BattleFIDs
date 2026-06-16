import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect } from '@/lib/neynar';
import { currentWeekId, nextWeekId } from '@/lib/weeklyScoring';
import { boundsForGameId, fastRoundsEnabled, gameWeekIdForDisplay, gameWeekIdForNewTeam, maybeStartRound } from '@/lib/gameSchedule';
import { awardPoints, upsertPlayer } from '@/lib/points';

// GET /api/week/team?ownerFid=123  OR  ?ownerDeviceId=abc
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');
  const fid = ownerFid ? parseInt(ownerFid) : null;
  const device = ownerDeviceId ?? null;
  const weekId = searchParams.get('weekId') ?? await gameWeekIdForDisplay(fid, device);

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
    const playerRows = fid
      ? await sql`SELECT protocol_points, referral_code FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT protocol_points, referral_code FROM players WHERE owner_device_id = ${device}`;
    const player = playerRows[0] ?? null;

    const { end } = boundsForGameId(weekId);
    const weekRows = await sql`SELECT lock_at FROM weeks WHERE id = ${weekId}`;
    const lockAt = weekRows[0]?.lock_at ?? null;

    return NextResponse.json({
      team,
      weekId,
      endsAt: end.toISOString(),
      lockAt,
      scheduleMode: fastRoundsEnabled() ? 'fast' : 'weekly',
      player,
    });
  } catch {
    return NextResponse.json({ team: null, weekId, endsAt: null, player: null });
  }
}

// POST /api/week/team
// Body: { ownerFid?, ownerDeviceId?, castsFid, repliesFid, followersFid, scoreRiseFid, likesFid, targetWeekId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ownerFid, ownerDeviceId,
      castsFid, repliesFid, followersFid, scoreRiseFid, likesFid,
      targetWeekId,
    } = body;

    if (!ownerFid && !ownerDeviceId) return NextResponse.json({ error: 'owner required' }, { status: 400 });

    const slotFids = [castsFid, repliesFid, followersFid, scoreRiseFid, likesFid] as number[];
    if (slotFids.some(f => !f)) return NextResponse.json({ error: 'all 5 slots required' }, { status: 400 });

    const fid    = ownerFid    ? parseInt(ownerFid)    : null;
    const device = ownerDeviceId ?? null;

    // Ensure player row exists
    await upsertPlayer(fid, device);

    // Weekly mode accepts current/next week. Fast local mode always uses the open waiting round.
    const validWeeks = [currentWeekId(), nextWeekId()];
    const requestedWeekId = (targetWeekId && validWeeks.includes(targetWeekId)) ? targetWeekId : currentWeekId();
    const weekId = await gameWeekIdForNewTeam(requestedWeekId);
    const { start, end } = boundsForGameId(weekId);

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

    // A card can only be used once across main team + edition bonus slots.
    const bonusRows = fid
      ? await sql`
          SELECT card_fid FROM weekly_edition_picks
          WHERE week_id = ${weekId} AND owner_fid = ${fid}
        `
      : await sql`
          SELECT card_fid FROM weekly_edition_picks
          WHERE week_id = ${weekId} AND owner_device_id = ${device}
        `;
    const usedElsewhere = new Set<number>();
    for (const row of bonusRows) if (row.card_fid) usedElsewhere.add(Number(row.card_fid));

    const reused = slotFids.filter(f => usedElsewhere.has(f));
    if (reused.length > 0) {
      return NextResponse.json({ error: `card already used in another edition: FID ${reused[0]}` }, { status: 409 });
    }

    // Fetch Neynar baselines for followers slot and score_rise slot
    const baselineFids = [...new Set([followersFid, scoreRiseFid])] as number[];
    const neynarMap = await fetchNeynarUsersDirect(baselineFids);
    const followersBaseline = neynarMap.get(followersFid)?.follower_count ?? 0;
    const scoreBaseline     = neynarMap.get(scoreRiseFid)?.score          ?? 0;

    // Avg team battle score (used as a tiebreaker)
    const cardRows = await sql`
      SELECT fid, battle_score FROM cards WHERE fid = ANY(${slotFids}::int[])
    `;
    const avgTeamScore = cardRows.length > 0
      ? cardRows.reduce((s, r) => s + Number(r.battle_score), 0) / cardRows.length
      : 0;

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
          ${'league'}, ${avgTeamScore},
          ${followersBaseline}, ${scoreBaseline},
          NOW()
        )
        ON CONFLICT (week_id, owner_fid) DO UPDATE SET
          casts_fid          = EXCLUDED.casts_fid,
          replies_fid        = EXCLUDED.replies_fid,
          followers_fid      = EXCLUDED.followers_fid,
          score_rise_fid     = EXCLUDED.score_rise_fid,
          likes_fid          = EXCLUDED.likes_fid,
          chosen_tier        = 'league',
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
          ${'league'}, ${avgTeamScore},
          ${followersBaseline}, ${scoreBaseline},
          NOW()
        )
        ON CONFLICT (week_id, owner_device_id) DO UPDATE SET
          casts_fid          = EXCLUDED.casts_fid,
          replies_fid        = EXCLUDED.replies_fid,
          followers_fid      = EXCLUDED.followers_fid,
          score_rise_fid     = EXCLUDED.score_rise_fid,
          likes_fid          = EXCLUDED.likes_fid,
          chosen_tier        = 'league',
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

    await maybeStartRound(weekId);
    const weekRows = await sql`SELECT lock_at, ends_at FROM weeks WHERE id = ${weekId}`;

    return NextResponse.json({
      ok: true,
      weekId,
      lockAt: weekRows[0]?.lock_at ?? null,
      endsAt: weekRows[0]?.ends_at ?? end.toISOString(),
      scheduleMode: fastRoundsEnabled() ? 'fast' : 'weekly',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
