import { NextRequest, NextResponse } from 'next/server';
import { isAdminAddress } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address') ?? '';
  return NextResponse.json({ authorized: isAdminAddress(address) });
}
