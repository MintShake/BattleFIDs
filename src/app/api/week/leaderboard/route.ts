import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId } from '@/lib/weeklyScoring';

// GET /api/week/leaderboard?weekId=2026-W23&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weekId = searchParams.get('weekId') ?? currentWeekId();
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));

  try {
    const rows = await sql`
      SELECT
        wt.rank,
        wt.total_score,
        wt.owner_fid,
        wt.owner_device_id,
        wt.updated_at,
        cap.fid       AS cap_fid,
        cap.handle    AS cap_handle,
        cap.thumb_url AS cap_thumb,
        cap.rarity    AS cap_rarity,
        bc.fid        AS bc_fid,
        bc.handle     AS bc_handle,
        bc.thumb_url  AS bc_thumb,
        bc.rarity     AS bc_rarity,
        pc.fid        AS pc_fid,
        pc.handle     AS pc_handle,
        pc.thumb_url  AS pc_thumb,
        ag.fid        AS ag_fid,
        ag.handle     AS ag_handle,
        ag.thumb_url  AS ag_thumb,
        nc.fid        AS nc_fid,
        nc.handle     AS nc_handle,
        nc.thumb_url  AS nc_thumb
      FROM weekly_teams wt
      LEFT JOIN cards cap ON cap.fid = wt.captain_fid
      LEFT JOIN cards bc  ON bc.fid  = wt.broadcaster_fid
      LEFT JOIN cards pc  ON pc.fid  = wt.publisher_fid
      LEFT JOIN cards ag  ON ag.fid  = wt.agitator_fid
      LEFT JOIN cards nc  ON nc.fid  = wt.networker_fid
      WHERE wt.week_id = ${weekId}
      ORDER BY wt.total_score DESC, wt.updated_at ASC
      LIMIT ${limit}
    `;

    const leaderboard = rows.map((r, i) => ({
      rank:       r.rank ?? i + 1,
      totalScore: Number(r.total_score),
      ownerFid:   r.owner_fid,
      slots: {
        captain:     { fid: r.cap_fid, handle: r.cap_handle, thumb: r.cap_thumb, rarity: r.cap_rarity },
        broadcaster: { fid: r.bc_fid,  handle: r.bc_handle,  thumb: r.bc_thumb,  rarity: r.bc_rarity },
        publisher:   { fid: r.pc_fid,  handle: r.pc_handle,  thumb: r.pc_thumb },
        agitator:    { fid: r.ag_fid,  handle: r.ag_handle,  thumb: r.ag_thumb },
        networker:   { fid: r.nc_fid,  handle: r.nc_handle,  thumb: r.nc_thumb },
      },
    }));

    const [{ count }] = await sql`SELECT COUNT(*) FROM weekly_teams WHERE week_id = ${weekId}`;

    return NextResponse.json({ weekId, leaderboard, totalTeams: Number(count) });
  } catch {
    return NextResponse.json({ weekId, leaderboard: [], totalTeams: 0 });
  }
}
