import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { upsertPlayer } from '@/lib/points';

// POST /api/referral
// Body: { code, ownerFid?, ownerDeviceId? }
// Called when a new player joins via a referral link.
export async function POST(req: NextRequest) {
  try {
    const { code, ownerFid, ownerDeviceId } = await req.json();

    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    if (!ownerFid && !ownerDeviceId) return NextResponse.json({ error: 'owner required' }, { status: 400 });

    const fid    = ownerFid    ? parseInt(ownerFid)    : null;
    const device = ownerDeviceId ?? null;
    const normalizedCode = code.toUpperCase();

    await upsertPlayer(fid, device);

    // Validate code exists
    const refs = await sql`SELECT * FROM referrals WHERE code = ${normalizedCode}`;
    if (refs.length === 0) return NextResponse.json({ error: 'invalid code' }, { status: 404 });
    const ref = refs[0];

    // Don't let someone use their own code
    if (fid && ref.owner_fid === fid) return NextResponse.json({ error: 'cannot use own code' }, { status: 400 });
    if (device && ref.owner_device_id === device) return NextResponse.json({ error: 'cannot use own code' }, { status: 400 });

    // Check joiner hasn't already used a code
    const joinerRows = fid
      ? await sql`SELECT referred_by FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT referred_by FROM players WHERE owner_device_id = ${device}`;

    if (joinerRows[0]?.referred_by) return NextResponse.json({ error: 'already used a referral code' }, { status: 400 });

    // Record on joiner
    if (fid) {
      await sql`UPDATE players SET referred_by = ${normalizedCode} WHERE owner_fid = ${fid}`;
    } else {
      await sql`UPDATE players SET referred_by = ${normalizedCode} WHERE owner_device_id = ${device}`;
    }

    // Increment referral use count
    await sql`UPDATE referrals SET uses = uses + 1 WHERE code = ${normalizedCode}`;

    return NextResponse.json({ ok: true, bonusPending: 'first_pack_open' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
