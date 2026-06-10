import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/players/wallets?ownerFid=123 or ?ownerDeviceId=abc
// Returns all wallets linked to this player
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');

  if (!ownerFid && !ownerDeviceId) return NextResponse.json({ wallets: [], linkedFid: null });

  // Always read from players table — authoritative for wallet_address + linked_fid
  const playerRows = ownerFid
    ? await sql`SELECT wallet_address, linked_fid FROM players WHERE owner_fid = ${parseInt(ownerFid)} LIMIT 1`
    : await sql`SELECT wallet_address, linked_fid FROM players WHERE owner_device_id = ${ownerDeviceId} LIMIT 1`;

  const linkedFid: number | null = playerRows[0]?.linked_fid ?? null;

  // Try player_wallets table for the full list (may not exist yet)
  try {
    const rows = ownerFid
      ? await sql`SELECT wallet_address, linked_fid FROM player_wallets WHERE owner_fid = ${parseInt(ownerFid)} ORDER BY created_at ASC`
      : await sql`SELECT wallet_address, linked_fid FROM player_wallets WHERE owner_device_id = ${ownerDeviceId} ORDER BY created_at ASC`;

    return NextResponse.json({
      wallets: rows.map(r => ({ address: r.wallet_address, linkedFid: r.linked_fid ?? null })),
      linkedFid,
    });
  } catch {
    // player_wallets not migrated yet — return single wallet from players row
    const w = playerRows[0]?.wallet_address;
    return NextResponse.json({
      wallets: w ? [{ address: w, linkedFid }] : [],
      linkedFid,
    });
  }
}

// POST /api/players/wallets
// Body: { walletAddress, ownerFid?, ownerDeviceId?, resolvedFid? }
// Adds a wallet, resolves linked FID, updates primary link on players table
export async function POST(req: NextRequest) {
  const { walletAddress, ownerFid, ownerDeviceId, resolvedFid } = await req.json();

  if (!walletAddress || (!ownerFid && !ownerDeviceId)) {
    return NextResponse.json({ error: 'walletAddress + identity required' }, { status: 400 });
  }

  const wallet = walletAddress.toLowerCase();

  try {
    let linkedFid: number | null = resolvedFid ?? null;

    // If no resolved FID yet, check existing player rows or call Neynar
    if (!linkedFid) {
      const existing = await sql`
        SELECT linked_fid FROM player_wallets
        WHERE wallet_address = ${wallet} AND linked_fid IS NOT NULL
        LIMIT 1
      `;
      if (existing.length > 0) {
        linkedFid = existing[0].linked_fid;
      } else {
        // Server-side Neynar lookup
        try {
          const res = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${wallet}`,
            { headers: { 'x-api-key': process.env.NEYNAR_API_KEY ?? '' } },
          );
          if (res.ok) {
            const data = await res.json();
            const users = Object.values(data) as { fid: number }[][];
            linkedFid = users[0]?.[0]?.fid ?? null;
          }
        } catch { /* ignore */ }
      }
    }

    // Try to upsert into player_wallets (table may not exist yet — non-fatal)
    try {
      if (ownerFid) {
        await sql`
          INSERT INTO player_wallets (owner_fid, wallet_address, linked_fid)
          VALUES (${ownerFid}, ${wallet}, ${linkedFid})
          ON CONFLICT (wallet_address) DO UPDATE
            SET owner_fid = ${ownerFid}, linked_fid = COALESCE(EXCLUDED.linked_fid, player_wallets.linked_fid)
        `;
      } else {
        await sql`
          INSERT INTO player_wallets (owner_device_id, wallet_address, linked_fid)
          VALUES (${ownerDeviceId}, ${wallet}, ${linkedFid})
          ON CONFLICT (wallet_address) DO UPDATE
            SET owner_device_id = ${ownerDeviceId}, linked_fid = COALESCE(EXCLUDED.linked_fid, player_wallets.linked_fid)
        `;
      }
    } catch { /* player_wallets not migrated yet — fall through to players update */ }

    // Always update the players row — this is the authoritative identity bridge
    if (ownerFid) {
      await sql`UPDATE players SET wallet_address = ${wallet} WHERE owner_fid = ${ownerFid}`;
    } else if (linkedFid) {
      await sql`UPDATE players SET linked_fid = ${linkedFid}, wallet_address = ${wallet} WHERE owner_device_id = ${ownerDeviceId}`;
    } else {
      await sql`UPDATE players SET wallet_address = ${wallet} WHERE owner_device_id = ${ownerDeviceId}`;
    }

    return NextResponse.json({ ok: true, linkedFid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/players/wallets?wallet=0x...&ownerFid=123 or &ownerDeviceId=abc
// Removes a specific wallet. If it was the last/primary wallet, also clears players.linked_fid
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const wallet        = searchParams.get('wallet')?.toLowerCase();
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');

  if (!wallet || (!ownerFid && !ownerDeviceId)) {
    return NextResponse.json({ error: 'wallet + identity required' }, { status: 400 });
  }

  try {
    await sql`DELETE FROM player_wallets WHERE wallet_address = ${wallet}`;

    // Check if any remaining wallets for this player
    const remaining = ownerFid
      ? await sql`SELECT wallet_address FROM player_wallets WHERE owner_fid = ${parseInt(ownerFid)} LIMIT 1`
      : await sql`SELECT wallet_address FROM player_wallets WHERE owner_device_id = ${ownerDeviceId} LIMIT 1`;

    if (remaining.length === 0) {
      // No wallets left — clear from players table too
      if (ownerFid) {
        await sql`UPDATE players SET wallet_address = NULL WHERE owner_fid = ${parseInt(ownerFid)}`;
      } else {
        await sql`UPDATE players SET wallet_address = NULL, linked_fid = NULL WHERE owner_device_id = ${ownerDeviceId}`;
      }
    } else {
      // Update to a remaining wallet
      const nextWallet = remaining[0].wallet_address;
      if (ownerFid) {
        await sql`UPDATE players SET wallet_address = ${nextWallet} WHERE owner_fid = ${parseInt(ownerFid)}`;
      } else {
        // Re-derive linked_fid from remaining wallets
        const withLink = ownerFid
          ? await sql`SELECT linked_fid FROM player_wallets WHERE owner_fid = ${parseInt(ownerFid!)} AND linked_fid IS NOT NULL LIMIT 1`
          : await sql`SELECT linked_fid FROM player_wallets WHERE owner_device_id = ${ownerDeviceId} AND linked_fid IS NOT NULL LIMIT 1`;
        const newLinkedFid = withLink[0]?.linked_fid ?? null;
        await sql`UPDATE players SET wallet_address = ${nextWallet}, linked_fid = ${newLinkedFid} WHERE owner_device_id = ${ownerDeviceId}`;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
