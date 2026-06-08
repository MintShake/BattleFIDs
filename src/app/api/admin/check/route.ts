import { NextRequest, NextResponse } from 'next/server';
import { isAdminAddress } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const fid     = req.nextUrl.searchParams.get('fid');
  const address = req.nextUrl.searchParams.get('address');

  // Fast path — direct address check (used internally)
  if (address) {
    return NextResponse.json({ authorized: isAdminAddress(address), custody: address });
  }

  // FID path — look up custody address via Neynar
  if (!fid) return NextResponse.json({ authorized: false, custody: null });

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey)  return NextResponse.json({ authorized: false, custody: null });

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      { headers: { 'x-api-key': apiKey, accept: 'application/json' } },
    );
    if (!res.ok) return NextResponse.json({ authorized: false, custody: null });

    const data = await res.json();
    const custody = (data.users?.[0]?.custody_address ?? '') as string;
    return NextResponse.json({ authorized: isAdminAddress(custody), custody });
  } catch {
    return NextResponse.json({ authorized: false, custody: null });
  }
}
