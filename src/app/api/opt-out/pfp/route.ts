import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/opt-out/pfp?fid=X — returns URLs the FID holder has opted out
export async function GET(req: NextRequest) {
  const fid = parseInt(req.nextUrl.searchParams.get('fid') ?? '');
  if (isNaN(fid)) return NextResponse.json({ optedOut: [] });

  const rows = await sql`
    SELECT image_url FROM pfp_blocklist
    WHERE fid = ${fid} AND reason = 'user_optout'
  `;

  return NextResponse.json({ optedOut: rows.map(r => r.image_url as string) });
}

// POST /api/opt-out/pfp
// Body: { fid: number, imageUrl: string }
// FID holder removes one of their own pfps from all card displays.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fid: number | undefined = body.fid;
    const imageUrl: string | undefined = body.imageUrl;

    if (!fid || !imageUrl) {
      return NextResponse.json({ error: 'fid and imageUrl are required' }, { status: 400 });
    }

    await sql`
      INSERT INTO pfp_blocklist (fid, image_url, reason)
      VALUES (${fid}, ${imageUrl}, 'user_optout')
      ON CONFLICT (fid, image_url) DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[opt-out/pfp]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/opt-out/pfp
// Body: { fid: number, imageUrl: string }
// Undo a user opt-out (only removes user_optout rows, not admin blocks).
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const fid: number | undefined = body.fid;
    const imageUrl: string | undefined = body.imageUrl;

    if (!fid || !imageUrl) {
      return NextResponse.json({ error: 'fid and imageUrl are required' }, { status: 400 });
    }

    await sql`
      DELETE FROM pfp_blocklist
      WHERE fid = ${fid} AND image_url = ${imageUrl} AND reason = 'user_optout'
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
