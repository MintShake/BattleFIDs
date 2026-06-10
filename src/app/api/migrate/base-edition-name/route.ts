import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  await sql`
    UPDATE editions
    SET name = 'The Protocol',
        header_era = 'FARCASTER',
        season_label = 'The Protocol — Base Season'
    WHERE id = 'base'
  `;
  return NextResponse.json({ ok: true });
}
