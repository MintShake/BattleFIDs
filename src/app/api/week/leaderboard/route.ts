import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId } from '@/lib/weeklyScoring';

// GET /api/week/leaderboard?weekId=2026-W23&group=beginner|pro&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weekId = searchParams.get('weekId') ?? currentWeekId();
  const group  = searchParams.get('group'); // 'beginner' | 'pro' | null (all)
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));

  try {
    const rows = group
      ? await sql`
          SELECT
            wt.rank, wt.slot_points, wt.owner_fid, wt.chosen_tier, wt.assigned_group, wt.avg_team_score,
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
            AND (
              (wt.chosen_tier != 'confident' AND wt.chosen_tier = ${group})
              OR (wt.chosen_tier = 'confident' AND wt.assigned_group = ${group})
            )
          ORDER BY wt.slot_points DESC, wt.avg_team_score DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT
            wt.rank, wt.slot_points, wt.owner_fid, wt.chosen_tier, wt.assigned_group, wt.avg_team_score,
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
          LIMIT ${limit}
        `;

    const leaderboard = rows.map((r, i) => ({
      rank:           r.rank ?? i + 1,
      slotPoints:     Number(r.slot_points ?? 0),
      protocolPoints: Number(r.protocol_points ?? 0),
      ownerFid:       r.owner_fid,
      chosenTier:     r.chosen_tier,
      assignedGroup:  r.assigned_group,
      avgTeamScore:   Number(r.avg_team_score ?? 0),
      slots: {
        casts:      { fid: r.ca_fid, handle: r.ca_handle, thumb: r.ca_thumb, rarity: r.ca_rarity },
        replies:    { fid: r.re_fid, handle: r.re_handle, thumb: r.re_thumb },
        followers:  { fid: r.fo_fid, handle: r.fo_handle, thumb: r.fo_thumb },
        score_rise: { fid: r.sr_fid, handle: r.sr_handle, thumb: r.sr_thumb },
        likes:      { fid: r.li_fid, handle: r.li_handle, thumb: r.li_thumb },
      },
    }));

    const [{ count }] = await sql`SELECT COUNT(*) FROM weekly_teams WHERE week_id = ${weekId}`;

    return NextResponse.json({ weekId, group: group ?? 'all', leaderboard, totalTeams: Number(count) });
  } catch {
    return NextResponse.json({ weekId, group: group ?? 'all', leaderboard: [], totalTeams: 0 });
  }
}
