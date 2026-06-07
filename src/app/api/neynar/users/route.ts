import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_BASE = 'https://api.neynar.com/v2';

export async function GET(request: NextRequest) {
  const fids = request.nextUrl.searchParams.get('fids');
  if (!fids) return NextResponse.json({ users: [] });

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    // No key — return empty users so cards still render without Neynar stats
    return NextResponse.json({ users: [] });
  }

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/bulk?fids=${fids}`,
      {
        headers: { 'x-api-key': apiKey, accept: 'application/json' },
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) {
      console.error('Neynar error', res.status, await res.text());
      return NextResponse.json({ users: [] }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('Neynar fetch failed', err);
    return NextResponse.json({ users: [] }, { status: 502 });
  }
}
