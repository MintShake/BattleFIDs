import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId } from '@/lib/weeklyScoring';

// GET /api/week/leaderboard?weekId=2026-W23&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weekId = searchParams.get('weekId') ?? currentWeekId();
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));

  const rows = await sql`
    SELECT
      wt.rank,
      wt.total_score,
      wt.owner_fid,
      wt.owner_device_id,
      wt.updated_at,
      -- captain card
      cap.image_id   AS cap_image_id,
      cap.handle     AS cap_handle,
      cap.thumb_url  AS cap_thumb,
      cap.rarity     AS cap_rarity,
      -- broadcaster
      bc.image_id    AS bc_image_id,
      bc.handle      AS bc_handle,
      bc.thumb_url   AS bc_thumb,
      bc.rarity      AS bc_rarity,
      -- publisher
      pc.image_id    AS pc_image_id,
      pc.handle      AS pc_handle,
      pc.thumb_url   AS pc_thumb,
      -- agitator
      ag.image_id    AS ag_image_id,
      ag.handle      AS ag_handle,
      ag.thumb_url   AS ag_thumb,
      -- networker
      nc.image_id    AS nc_image_id,
      nc.handle      AS nc_handle,
      nc.thumb_url   AS nc_thumb
    FROM weekly_teams wt
    LEFT JOIN cards cap ON cap.image_id = wt.captain_image_id
    LEFT JOIN cards bc  ON bc.image_id  = wt.broadcaster_image_id
    LEFT JOIN cards pc  ON pc.image_id  = wt.publisher_image_id
    LEFT JOIN cards ag  ON ag.image_id  = wt.agitator_image_id
    LEFT JOIN cards nc  ON nc.image_id  = wt.networker_image_id
    WHERE wt.week_id = ${weekId}
    ORDER BY wt.total_score DESC, wt.updated_at ASC
    LIMIT ${limit}
  `;

  const leaderboard = rows.map((r, i) => ({
    rank:       r.rank ?? i + 1,
    totalScore: Number(r.total_score),
    ownerFid:   r.owner_fid,
    slots: {
      captain:     { imageId: r.cap_image_id, handle: r.cap_handle, thumb: r.cap_thumb, rarity: r.cap_rarity },
      broadcaster: { imageId: r.bc_image_id,  handle: r.bc_handle,  thumb: r.bc_thumb,  rarity: r.bc_rarity },
      publisher:   { imageId: r.pc_image_id,  handle: r.pc_handle,  thumb: r.pc_thumb },
      agitator:    { imageId: r.ag_image_id,  handle: r.ag_handle,  thumb: r.ag_thumb },
      networker:   { imageId: r.nc_image_id,  handle: r.nc_handle,  thumb: r.nc_thumb },
    },
  }));

  // Total teams entered this week
  const [{ count }] = await sql`SELECT COUNT(*) FROM weekly_teams WHERE week_id = ${weekId}`;

  return NextResponse.json({ weekId, leaderboard, totalTeams: Number(count) });
}
