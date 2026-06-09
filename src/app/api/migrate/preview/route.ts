import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/migrate/preview — safe to re-run, adds preview snapshot columns
export async function GET() {
  try {
    await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS preview_casts       INT`;
    await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS preview_replies     INT`;
    await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS preview_followers   INT`;
    await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS preview_score_rise  INT`;
    await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS preview_likes       INT`;
    await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS preview_updated_at  TIMESTAMPTZ`;
    return NextResponse.json({ ok: true, migration: 'preview' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
