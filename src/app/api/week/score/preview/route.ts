import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect, fetchWeeklyStats, fetchCastCount } from '@/lib/neynar';
import { boundsForGameId, fastRoundsEnabled, gameWeekIdForDisplay } from '@/lib/gameSchedule';
import { triggerDueFastRoundScoring } from '@/lib/autoScore';

// POST /api/week/score/preview
// Normal mode:  { ownerFid?, ownerDeviceId? }
//   → loads team from DB, persists snapshot, compares vs your group
// Draft mode:   { ownerFid?, draftFids: { castsFid, repliesFid, followersFid, scoreRiseFid, likesFid } }
//   → uses those FIDs, does NOT persist, compares vs all current-week locked teams (any group)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerFid, ownerDeviceId, draftFids } = body;
    const fid    = ownerFid    ? parseInt(ownerFid)    : null;
    const device = ownerDeviceId ?? null;

    const scoredWeekId = await triggerDueFastRoundScoring(req.nextUrl.origin);
    const weekId = scoredWeekId ?? await gameWeekIdForDisplay(fid, device);
    const { start: weekStart } = boundsForGameId(weekId);

    // ── Draft preview mode ──────────────────────────────────────────────────
    if (draftFids) {
      const { castsFid, repliesFid, followersFid, scoreRiseFid, likesFid } = draftFids;
      const uniqueFids = [...new Set([castsFid, repliesFid, followersFid, scoreRiseFid, likesFid].filter(Boolean) as number[])];

      if (uniqueFids.length === 0) return NextResponse.json({ error: 'no fids provided' }, { status: 400 });

      const [neynarMap, castsCount, repliesStats, likesStats] = await Promise.all([
        fetchNeynarUsersDirect(uniqueFids),
        fetchCastCount(castsFid, weekStart),
        fetchWeeklyStats(repliesFid, weekStart),
        fetchWeeklyStats(likesFid, weekStart),
      ]);

      const myValues = {
        preview_casts:      castsCount,
        preview_replies:    repliesStats.repliesSent,
        preview_followers:  neynarMap.get(followersFid)?.follower_count ?? 0,
        preview_score_rise: Math.round((neynarMap.get(scoreRiseFid)?.score ?? 0) * 1000),
        preview_likes:      likesStats.likesReceived,
      };

      // Compare vs all current-week teams that have preview snapshots (any group)
      const peers = await sql`
        SELECT
          preview_casts, preview_replies, preview_followers, preview_score_rise, preview_likes
        FROM weekly_teams
        WHERE week_id = ${weekId}
          AND preview_updated_at IS NOT NULL
      `;

      type SlotKey = 'casts' | 'replies' | 'followers' | 'score_rise' | 'likes';
      const slotMap: Record<SlotKey, string> = {
        casts:      'preview_casts',
        replies:    'preview_replies',
        followers:  'preview_followers',
        score_rise: 'preview_score_rise',
        likes:      'preview_likes',
      };

      const slots: Record<SlotKey, { value: number; beating: number; compared: number }> = {} as never;
      for (const [slot, col] of Object.entries(slotMap) as [SlotKey, string][]) {
        const myVal    = myValues[col as keyof typeof myValues];
        const compared = peers.length;
        const beating  = peers.filter(p => Number(p[col] ?? -1) < myVal).length;
        slots[slot] = { value: myVal, beating, compared };
      }

      return NextResponse.json({
        slots,
        myGroup: 'draft',
        totalInGroup: peers.length,
        updatedAt: new Date().toISOString(),
        isDraft: true,
      });
    }

    // ── Normal mode ─────────────────────────────────────────────────────────
    if (!fid && !device) return NextResponse.json({ error: 'owner required' }, { status: 400 });

    const rows = fid
      ? await sql`
          SELECT casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
                 followers_baseline, score_baseline,
                 preview_casts, preview_replies, preview_followers, preview_score_rise, preview_likes, preview_updated_at
          FROM weekly_teams
          WHERE week_id = ${weekId} AND owner_fid = ${fid}
        `
      : await sql`
          SELECT casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
                 followers_baseline, score_baseline,
                 preview_casts, preview_replies, preview_followers, preview_score_rise, preview_likes, preview_updated_at
          FROM weekly_teams
          WHERE week_id = ${weekId} AND owner_device_id = ${device}
        `;

    if (rows.length === 0) return NextResponse.json({ error: 'no team this week' }, { status: 404 });
    const team = rows[0];

    const castsFid      = Number(team.casts_fid);
    const repliesFid    = Number(team.replies_fid);
    const followersFid  = Number(team.followers_fid);
    const scoreRiseFid  = Number(team.score_rise_fid);
    const likesFid      = Number(team.likes_fid);

    const uniqueFids = [...new Set([castsFid, repliesFid, followersFid, scoreRiseFid, likesFid])];
    const [neynarMap, castsCount, repliesStats, likesStats] = await Promise.all([
      fetchNeynarUsersDirect(uniqueFids),
      fetchCastCount(castsFid, weekStart),
      fetchWeeklyStats(repliesFid, weekStart),
      fetchWeeklyStats(likesFid, weekStart),
    ]);

    const followersNow = neynarMap.get(followersFid)?.follower_count ?? 0;
    const scoreNow     = neynarMap.get(scoreRiseFid)?.score ?? 0;

    let myValues = {
      preview_casts:      castsCount,
      preview_replies:    repliesStats.repliesSent,
      preview_followers:  Math.max(0, followersNow - Number(team.followers_baseline ?? 0)),
      preview_score_rise: Math.max(0, Math.round((scoreNow - Number(team.score_baseline ?? 0)) * 1000)),
      preview_likes:      likesStats.likesReceived,
    };

    const liveAllZero = Object.values(myValues).every(v => Number(v) === 0);
    const storedPreview = {
      preview_casts:      Number(team.preview_casts ?? 0),
      preview_replies:    Number(team.preview_replies ?? 0),
      preview_followers:  Number(team.preview_followers ?? 0),
      preview_score_rise: Number(team.preview_score_rise ?? 0),
      preview_likes:      Number(team.preview_likes ?? 0),
    };
    const storedHasSignal = Object.values(storedPreview).some(v => v > 0);
    if (fastRoundsEnabled() && liveAllZero && team.preview_updated_at && storedHasSignal) {
      myValues = storedPreview;
    }

    if (fid) {
      await sql`
        UPDATE weekly_teams
        SET preview_casts      = ${myValues.preview_casts},
            preview_replies    = ${myValues.preview_replies},
            preview_followers  = ${myValues.preview_followers},
            preview_score_rise = ${myValues.preview_score_rise},
            preview_likes      = ${myValues.preview_likes},
            preview_updated_at = NOW()
        WHERE week_id = ${weekId} AND owner_fid = ${fid}
      `;
    } else {
      await sql`
        UPDATE weekly_teams
        SET preview_casts      = ${myValues.preview_casts},
            preview_replies    = ${myValues.preview_replies},
            preview_followers  = ${myValues.preview_followers},
            preview_score_rise = ${myValues.preview_score_rise},
            preview_likes      = ${myValues.preview_likes},
            preview_updated_at = NOW()
        WHERE week_id = ${weekId} AND owner_device_id = ${device}
      `;
    }

    const peers = await sql`
      SELECT
        preview_casts, preview_replies, preview_followers, preview_score_rise, preview_likes
      FROM weekly_teams
      WHERE week_id = ${weekId}
        AND preview_updated_at IS NOT NULL
    `;

    const [{ count: totalInGroup }] = await sql`
      SELECT COUNT(*) AS count FROM weekly_teams
      WHERE week_id = ${weekId}
    `;

    type SlotKey = 'casts' | 'replies' | 'followers' | 'score_rise' | 'likes';
    const slotMap: Record<SlotKey, string> = {
      casts:      'preview_casts',
      replies:    'preview_replies',
      followers:  'preview_followers',
      score_rise: 'preview_score_rise',
      likes:      'preview_likes',
    };

    const myValuesFlat: Record<string, number> = {
      preview_casts:      myValues.preview_casts,
      preview_replies:    myValues.preview_replies,
      preview_followers:  myValues.preview_followers,
      preview_score_rise: myValues.preview_score_rise,
      preview_likes:      myValues.preview_likes,
    };

    const slots: Record<SlotKey, { value: number; beating: number; compared: number }> = {} as never;
    for (const [slot, col] of Object.entries(slotMap) as [SlotKey, string][]) {
      const myVal  = myValuesFlat[col];
      const compared = peers.length;
      const beating  = peers.filter(p => Number(p[col] ?? -1) < myVal).length;
      slots[slot] = { value: myVal, beating, compared };
    }

    return NextResponse.json({
      slots,
      myGroup: 'league',
      totalInGroup: Number(totalInGroup),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
