import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/migrate/pfp-moderation
// Additive migration — creates moderation tables without touching existing data.
// Safe to re-run.
export async function GET() {
  await sql`
    CREATE TABLE IF NOT EXISTS pfp_reports (
      id          SERIAL PRIMARY KEY,
      fid         INTEGER NOT NULL,
      image_url   TEXT NOT NULL,
      reason      TEXT,
      reporter_fid INTEGER,
      reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved    BOOLEAN NOT NULL DEFAULT FALSE,
      resolution  TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pfp_reports_fid      ON pfp_reports(fid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pfp_reports_resolved ON pfp_reports(resolved)`;

  await sql`
    CREATE TABLE IF NOT EXISTS pfp_blocklist (
      id          SERIAL PRIMARY KEY,
      fid         INTEGER NOT NULL,
      image_url   TEXT NOT NULL,
      reason      TEXT,
      blocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (fid, image_url)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pfp_blocklist_url ON pfp_blocklist(image_url)`;

  return NextResponse.json({ ok: true, tables: ['pfp_reports', 'pfp_blocklist'] });
}
