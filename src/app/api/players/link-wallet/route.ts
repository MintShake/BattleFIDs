import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/players/link-wallet
// Body: { walletAddress, ownerFid?, ownerDeviceId? }
// Stores wallet on the player row. For device players, also checks if a FID player
// already has this wallet and sets linked_fid to merge the two identities.
export async function POST(req: NextRequest) {
  const { walletAddress, ownerFid, ownerDeviceId } = await req.json();

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
      return NextResponse.json({ ok: true, mode: 'fid' });
    }

    // Device player — store wallet, then check if any FID player has the same wallet
    await sql`
      UPDATE players SET wallet_address = ${wallet}
      WHERE owner_device_id = ${ownerDeviceId}
    `;

    const fidRows = await sql`
      SELECT owner_fid, wallet_address FROM players
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

    return NextResponse.json({ ok: true, mode: 'device', linkedFid: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
