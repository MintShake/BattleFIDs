import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAddress } from '@/lib/adminAuth';

function authorized(req: NextRequest): boolean {
  return isAdminAddress(req.headers.get('x-wallet-address'));
}

// PATCH /api/admin/reports/[id]
// Body: { action: 'dismiss' | 'block', reason?: string }
// 'block' inserts the URL into pfp_blocklist and marks the report resolved.
// 'dismiss' marks the report resolved without blocking.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const reportId = parseInt(id);
  if (isNaN(reportId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action: 'dismiss' | 'block' = body.action ?? 'dismiss';

  const [report] = await sql`SELECT fid, image_url FROM pfp_reports WHERE id = ${reportId}`;
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (action === 'block') {
    // Upgrade from suspended to permanently blocked
    await sql`
      INSERT INTO pfp_blocklist (fid, image_url, reason)
      VALUES (${report.fid}, ${report.image_url}, 'admin_block')
      ON CONFLICT (fid, image_url) DO UPDATE SET reason = 'admin_block'
    `;
  } else if (action === 'dismiss') {
    // Remove suspension — image becomes visible again
    await sql`
      DELETE FROM pfp_blocklist
      WHERE fid = ${report.fid} AND image_url = ${report.image_url} AND reason = 'suspended'
    `;
  }

  await sql`
    UPDATE pfp_reports
    SET resolved = TRUE, resolution = ${action}
    WHERE id = ${reportId}
  `;

  return NextResponse.json({ ok: true, action, fid: report.fid, imageUrl: report.image_url });
}
