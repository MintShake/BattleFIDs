import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { awardPoints, POINTS, upsertPlayer } from '@/lib/points';

// POST /api/share
// Body: { ownerFid?, ownerDeviceId? }
// Awards simulated Protocol Points for sharing, capped to once per 24 hours.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body.ownerFid ? parseInt(String(body.ownerFid)) : null;
    const device = body.ownerDeviceId ? String(body.ownerDeviceId) : null;

    if (!fid && !device) {
      return NextResponse.json({ error: 'owner required' }, { status: 400 });
    }

    await upsertPlayer(fid, device);

    const recent = fid
      ? await sql`
          SELECT created_at FROM protocol_points_log
          WHERE owner_fid = ${fid}
            AND action = 'share'
            AND created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC
          LIMIT 1
        `
      : await sql`
          SELECT created_at FROM protocol_points_log
          WHERE device_id = ${device}
            AND action = 'share'
            AND created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC
          LIMIT 1
        `;

    if (recent.length === 0) {
      await awardPoints(fid, device, 'share', 1, { cadence: 'daily_share' });
    }

    const rows = fid
      ? await sql`SELECT protocol_points FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT protocol_points FROM players WHERE owner_device_id = ${device}`;

    return NextResponse.json({
      ok: true,
      awarded: recent.length === 0,
      pointsAwarded: recent.length === 0 ? POINTS.share : 0,
      protocolPoints: rows[0]?.protocol_points ?? 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
