import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { boundsForGameId, gameWeekIdForDisplay } from '@/lib/gameSchedule';
import { fetchCastCount, fetchNeynarUsersDirect, fetchWeeklyStats } from '@/lib/neynar';

type PreviewCol = 'preview_casts' | 'preview_replies' | 'preview_followers' | 'preview_score_rise' | 'preview_likes';
const PREVIEW_COLS: PreviewCol[] = ['preview_casts', 'preview_replies', 'preview_followers', 'preview_score_rise', 'preview_likes'];

async function refreshLivePreviews(weekId: string) {
  const { start } = boundsForGameId(weekId);
  const teams = await sql`
    SELECT id, casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
           followers_baseline, score_baseline
    FROM weekly_teams
    WHERE week_id = ${weekId}
      AND casts_fid IS NOT NULL
  `;

  if (teams.length === 0) return;

  const allFids = new Set<number>();
  for (const t of teams) {
    for (const fid of [t.casts_fid, t.replies_fid, t.followers_fid, t.score_rise_fid, t.likes_fid]) {
      if (fid) allFids.add(Number(fid));
    }
  }

  const neynarMap = await fetchNeynarUsersDirect([...allFids]);

  for (const t of teams) {
    const castsFid = Number(t.casts_fid);
    const repliesFid = Number(t.replies_fid);
    const followersFid = Number(t.followers_fid);
    const scoreRiseFid = Number(t.score_rise_fid);
    const likesFid = Number(t.likes_fid);

    const [castsCount, repliesStats, likesStats] = await Promise.all([
      fetchCastCount(castsFid, start),
      fetchWeeklyStats(repliesFid, start),
      fetchWeeklyStats(likesFid, start),
    ]);

    const followersNow = neynarMap.get(followersFid)?.follower_count ?? 0;
    const scoreNow = neynarMap.get(scoreRiseFid)?.score ?? 0;

    await sql`
      UPDATE weekly_teams
      SET preview_casts      = ${castsCount},
          preview_replies    = ${repliesStats.repliesSent},
          preview_followers  = ${Math.max(0, followersNow - Number(t.followers_baseline ?? 0))},
          preview_score_rise = ${Math.max(0, Math.round((scoreNow - Number(t.score_baseline ?? 0)) * 1000))},
          preview_likes      = ${likesStats.likesReceived},
          preview_updated_at = NOW()
      WHERE id = ${t.id}
    `;
  }
}

// GET /api/week/leaderboard?weekId=2026-W23&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weekId = searchParams.get('weekId') ?? await gameWeekIdForDisplay();
  const live = searchParams.get('live') === '1';
  const limit  = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const offset = (page - 1) * limit;

  try {
    if (live) await refreshLivePreviews(weekId);

    const rows = await sql`
          SELECT
            wt.rank, wt.slot_points, wt.owner_fid, wt.avg_team_score,
            wt.preview_casts, wt.preview_replies, wt.preview_followers, wt.preview_score_rise, wt.preview_likes,
            wt.preview_updated_at,
            p.protocol_points,
            ca.fid AS ca_fid, ca.handle AS ca_handle, ca.thumb_url AS ca_thumb, ca.rarity AS ca_rarity,
            re.fid AS re_fid, re.handle AS re_handle, re.thumb_url AS re_thumb,
            fo.fid AS fo_fid, fo.handle AS fo_handle, fo.thumb_url AS fo_thumb,
            sr.fid AS sr_fid, sr.handle AS sr_handle, sr.thumb_url AS sr_thumb,
            li.fid AS li_fid, li.handle AS li_handle, li.thumb_url AS li_thumb
          FROM weekly_teams wt
          LEFT JOIN players p  ON (p.owner_fid = wt.owner_fid OR p.owner_device_id = wt.owner_device_id)
          LEFT JOIN cards ca ON ca.fid = wt.casts_fid
          LEFT JOIN cards re ON re.fid = wt.replies_fid
          LEFT JOIN cards fo ON fo.fid = wt.followers_fid
          LEFT JOIN cards sr ON sr.fid = wt.score_rise_fid
          LEFT JOIN cards li ON li.fid = wt.likes_fid
          WHERE wt.week_id = ${weekId}
          ORDER BY wt.slot_points DESC, wt.avg_team_score DESC
        `;

    const livePoints = new Map<unknown, number>();
    if (live) {
      for (const row of rows) livePoints.set(row, 0);
      for (const col of PREVIEW_COLS) {
        for (const row of rows) {
          const value = Number(row[col] ?? 0);
          const beating = rows.filter(peer => Number(peer[col] ?? 0) < value).length;
          livePoints.set(row, (livePoints.get(row) ?? 0) + beating);
        }
      }
      rows.sort((a, b) => {
        const byLive = (livePoints.get(b) ?? 0) - (livePoints.get(a) ?? 0);
        return byLive || Number(b.avg_team_score ?? 0) - Number(a.avg_team_score ?? 0);
      });
    }

    const pageRows = rows.slice(offset, offset + limit);
    const leaderboard = pageRows.map((r, i) => ({
      rank:           live ? offset + i + 1 : r.rank ?? offset + i + 1,
      slotPoints:     live ? livePoints.get(r) ?? 0 : Number(r.slot_points ?? 0),
      finalSlotPoints: Number(r.slot_points ?? 0),
      protocolPoints: Number(r.protocol_points ?? 0),
      ownerFid:       r.owner_fid,
      avgTeamScore:   Number(r.avg_team_score ?? 0),
      isLive:          live,
      previewUpdatedAt: r.preview_updated_at ?? null,
      preview: {
        casts:      Number(r.preview_casts ?? 0),
        replies:    Number(r.preview_replies ?? 0),
        followers:  Number(r.preview_followers ?? 0),
        score_rise: Number(r.preview_score_rise ?? 0),
        likes:      Number(r.preview_likes ?? 0),
      },
      slots: {
        casts:      { fid: r.ca_fid, handle: r.ca_handle, thumb: r.ca_thumb, rarity: r.ca_rarity },
        replies:    { fid: r.re_fid, handle: r.re_handle, thumb: r.re_thumb },
        followers:  { fid: r.fo_fid, handle: r.fo_handle, thumb: r.fo_thumb },
        score_rise: { fid: r.sr_fid, handle: r.sr_handle, thumb: r.sr_thumb },
        likes:      { fid: r.li_fid, handle: r.li_handle, thumb: r.li_thumb },
      },
    }));

    const [{ count }] = await sql`SELECT COUNT(*) FROM weekly_teams WHERE week_id = ${weekId}`;

    return NextResponse.json({
      weekId,
      group:      'league',
      leaderboard,
      totalTeams: Number(count),
      page,
      limit,
      live,
      hasMore:    offset + limit < Number(count),
    });
  } catch {
    return NextResponse.json({ weekId, group: 'league', leaderboard: [], totalTeams: 0 });
  }
}
