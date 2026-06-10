import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS wallet_address TEXT`;
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS linked_fid INTEGER`;
  return NextResponse.json({ ok: true });
}
