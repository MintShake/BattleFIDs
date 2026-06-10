import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/players/link-wallet?ownerFid=123 or ?ownerDeviceId=abc
// Returns current linked_fid for a player without mutating anything
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');

  if (!ownerFid && !ownerDeviceId) {
    return NextResponse.json({ linkedFid: null });
  }

  try {
    const rows = ownerFid
      ? await sql`SELECT linked_fid, wallet_address FROM players WHERE owner_fid = ${parseInt(ownerFid)} LIMIT 1`
      : await sql`SELECT linked_fid, wallet_address FROM players WHERE owner_device_id = ${ownerDeviceId} LIMIT 1`;

    const row = rows[0];
    return NextResponse.json({ linkedFid: row?.linked_fid ?? null, walletAddress: row?.wallet_address ?? null });
  } catch {
    return NextResponse.json({ linkedFid: null });
  }
}

// POST /api/players/link-wallet
// Body: { walletAddress, ownerFid?, ownerDeviceId?, resolvedFid? }
// resolvedFid: FID already resolved by the client via Neynar address lookup (useWallet hook)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, ownerFid, ownerDeviceId, resolvedFid } = body;

  if (!walletAddress || (!ownerFid && !ownerDeviceId)) {
    return NextResponse.json({ error: 'walletAddress + identity required' }, { status: 400 });
  }

  const wallet = walletAddress.toLowerCase();

  try {
    if (ownerFid) {
      await sql`
        UPDATE players SET wallet_address = ${wallet}
        WHERE owner_fid = ${ownerFid}
      `;
      // Retroactively link any device players who already stored this wallet
      await sql`
        UPDATE players SET linked_fid = ${ownerFid}
        WHERE wallet_address = ${wallet}
          AND owner_fid IS NULL
          AND (linked_fid IS NULL OR linked_fid != ${ownerFid})
      `;
      return NextResponse.json({ ok: true, mode: 'fid' });
    }

    // Device player — store wallet
    await sql`
      UPDATE players SET wallet_address = ${wallet}
      WHERE owner_device_id = ${ownerDeviceId}
    `;

    // Priority 1: client already resolved FID from this wallet via Neynar
    if (resolvedFid) {
      await sql`
        UPDATE players SET linked_fid = ${resolvedFid}
        WHERE owner_device_id = ${ownerDeviceId}
      `;
      return NextResponse.json({ ok: true, mode: 'device', linkedFid: resolvedFid });
    }

    // Priority 2: a FID player row already has this wallet stored
    const fidRows = await sql`
      SELECT owner_fid FROM players
      WHERE wallet_address = ${wallet} AND owner_fid IS NOT NULL
      LIMIT 1
    `;

    if (fidRows.length > 0) {
      const linkedFid = fidRows[0].owner_fid;
      await sql`
        UPDATE players SET linked_fid = ${linkedFid}
        WHERE owner_device_id = ${ownerDeviceId}
      `;
      return NextResponse.json({ ok: true, mode: 'device', linkedFid });
    }

    // Priority 3: look up Neynar server-side by wallet address
    try {
      const neynarRes = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${wallet}`,
        { headers: { 'x-api-key': process.env.NEYNAR_API_KEY ?? '' } },
      );
      if (neynarRes.ok) {
        const neynarData = await neynarRes.json();
        const users = Object.values(neynarData) as { fid: number }[][];
        const fid = users[0]?.[0]?.fid;
        if (fid) {
          await sql`UPDATE players SET linked_fid = ${fid} WHERE owner_device_id = ${ownerDeviceId}`;
          return NextResponse.json({ ok: true, mode: 'device', linkedFid: fid });
        }
      }
    } catch { /* ignore Neynar errors */ }

    return NextResponse.json({ ok: true, mode: 'device', linkedFid: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
