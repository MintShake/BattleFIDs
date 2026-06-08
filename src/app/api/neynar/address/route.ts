import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// GET /api/neynar/address?address=0x...
// Resolves an Ethereum address to a Farcaster user via Neynar
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')?.toLowerCase();
  if (!address) return NextResponse.json({ user: null });

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return NextResponse.json({ user: null });

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      { headers: { 'x-api-key': apiKey, accept: 'application/json' } },
    );
    if (!res.ok) return NextResponse.json({ user: null });

    const data = await res.json();
    // Response is { [address]: user[] }
    const users = data[address] ?? data[Object.keys(data)[0]] ?? [];
    const user = Array.isArray(users) ? users[0] ?? null : null;
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
