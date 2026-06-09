import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect, fetchWeeklyStats, fetchCastCount } from '@/lib/neynar';
import { currentWeekId, weekBounds } from '@/lib/weeklyScoring';

// POST /api/week/score/preview
// Body: { ownerFid?, ownerDeviceId? }
// Fetches live Neynar metrics for the player's 5 slot FIDs, stores them as a
// snapshot, then returns each slot value + how many group peers they're beating.
export async function POST(req: NextRequest) {
  try {
    const { ownerFid, ownerDeviceId } = await req.json();
    const fid    = ownerFid    ? parseInt(ownerFid)    : null;
    const device = ownerDeviceId ?? null;

    if (!fid && !device) return NextResponse.json({ error: 'owner required' }, { status: 400 });

    const weekId = currentWeekId();

    // Load team
    const rows = fid
      ? await sql`
          SELECT casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
                 chosen_tier, assigned_group, followers_baseline, score_baseline
          FROM weekly_teams
          WHERE week_id = ${weekId} AND owner_fid = ${fid}
        `
      : await sql`
          SELECT casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
                 chosen_tier, assigned_group, followers_baseline, score_baseline
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

    const { start: weekStart } = weekBounds(weekId);

    // Fetch all data in parallel
    const uniqueFids = [...new Set([castsFid, repliesFid, followersFid, scoreRiseFid, likesFid])];
    const [neynarMap, castsCount, repliesStats, likesStats] = await Promise.all([
      fetchNeynarUsersDirect(uniqueFids),
      fetchCastCount(castsFid, weekStart),
      fetchWeeklyStats(repliesFid, weekStart),
      fetchWeeklyStats(likesFid, weekStart),
    ]);

    const followersNow = neynarMap.get(followersFid)?.follower_count ?? 0;
    const scoreNow     = neynarMap.get(scoreRiseFid)?.score ?? 0;

    const myValues = {
      preview_casts:      castsCount,
      preview_replies:    repliesStats.repliesSent,
      preview_followers:  Math.max(0, followersNow - Number(team.followers_baseline ?? 0)),
      preview_score_rise: Math.max(0, Math.round((scoreNow - Number(team.score_baseline ?? 0)) * 1000)),
      preview_likes:      likesStats.likesReceived,
    };

    // Persist snapshot
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

    // Determine my effective group
    const myTier  = team.chosen_tier as string;
    const myGroup = myTier === 'pro'
      ? 'pro'
      : myTier === 'confident'
        ? (team.assigned_group ?? 'beginner')
        : 'beginner';

    // Fetch all peer snapshots in my group (those who have updated at least once)
    const peers = await sql`
      SELECT
        chosen_tier, assigned_group,
        preview_casts, preview_replies, preview_followers, preview_score_rise, preview_likes
      FROM weekly_teams
      WHERE week_id = ${weekId}
        AND preview_updated_at IS NOT NULL
        AND (
          (chosen_tier = 'pro'       AND ${myGroup} = 'pro')
          OR (chosen_tier = 'beginner' AND ${myGroup} = 'beginner')
          OR (chosen_tier = 'confident' AND assigned_group = ${myGroup})
        )
    `;

    // Total teams in group (with or without preview data)
    const [{ count: totalInGroup }] = await sql`
      SELECT COUNT(*) AS count FROM weekly_teams
      WHERE week_id = ${weekId}
        AND (
          (chosen_tier = 'pro'        AND ${myGroup} = 'pro')
          OR (chosen_tier = 'beginner'  AND ${myGroup} = 'beginner')
          OR (chosen_tier = 'confident' AND assigned_group = ${myGroup})
        )
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
      myGroup,
      totalInGroup: Number(totalInGroup),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
