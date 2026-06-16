import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { upsertPlayer, awardPoints } from '@/lib/points';

// GET /api/players?ownerFid=123  OR  ?ownerDeviceId=abc
// Returns (or creates) the player row — call on app launch to award app_add points once.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');

  if (!ownerFid && !ownerDeviceId) {
    return NextResponse.json({ error: 'owner required' }, { status: 400 });
  }

  try {
    const fid = ownerFid ? parseInt(ownerFid) : null;
    const device = ownerDeviceId ?? null;

    // Check if new player (no row yet)
    const existing = fid
      ? await sql`SELECT * FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT * FROM players WHERE owner_device_id = ${device}`;

    const isNew = existing.length === 0;
    const player = await upsertPlayer(fid, device);

    if (isNew && player) {
      await awardPoints(fid, device, 'app_add');
    }

    // Re-fetch with updated points
    const rows = fid
      ? await sql`SELECT * FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT * FROM players WHERE owner_device_id = ${device}`;

    const p = rows[0];
    return NextResponse.json({
      protocolPoints: p.protocol_points,
      totalWins:      p.total_wins,
      totalLosses:    p.total_losses,
      referralCode:   p.referral_code,
      isNew,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
