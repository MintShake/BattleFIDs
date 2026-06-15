import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/report/pfp
// Body: { fid: number, imageUrl: string, reason?: string, reporterFid?: number }
// Open endpoint — no auth. Rate limiting is handled at the infra layer.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fid: number | undefined = body.fid;
    const imageUrl: string | undefined = body.imageUrl;
    const reason: string | undefined = body.reason ?? null;
    const reporterFid: number | undefined = body.reporterFid ?? null;

    if (!fid || !imageUrl) {
      return NextResponse.json({ error: 'fid and imageUrl are required' }, { status: 400 });
    }

    await sql`
      INSERT INTO pfp_reports (fid, image_url, reason, reporter_fid)
      VALUES (${fid}, ${imageUrl}, ${reason ?? null}, ${reporterFid ?? null})
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[report/pfp]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
