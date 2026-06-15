import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAddress } from '@/lib/adminAuth';

function authorized(req: NextRequest): boolean {
  return isAdminAddress(req.headers.get('x-wallet-address'));
}

// GET /api/admin/reports — pending reports, newest first
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, fid, image_url, reason, reporter_fid, reported_at, resolved, resolution
    FROM pfp_reports
    ORDER BY reported_at DESC
    LIMIT 200
  `;

  return NextResponse.json({ reports: rows });
}
