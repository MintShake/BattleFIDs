import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/migrate/league
// Additive migration — safe to re-run, never drops data.
// Adds: players, protocol_points_log, referrals tables.
// Alters: weekly_teams (new slot columns, tier, baselines), weeks (pro_threshold).
export async function GET() {
  // ── New tables ─────────────────────────────────────────────────────────────

  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_fid        INTEGER UNIQUE,
      owner_device_id  TEXT UNIQUE,
      protocol_points  INTEGER NOT NULL DEFAULT 0,
      tier             TEXT NOT NULL DEFAULT 'beginner',
      locked_to_pro    BOOLEAN NOT NULL DEFAULT FALSE,
      total_wins       INTEGER NOT NULL DEFAULT 0,
      total_losses     INTEGER NOT NULL DEFAULT 0,
      referral_code    TEXT UNIQUE,
      referred_by      TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_players_fid    ON players(owner_fid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_players_device ON players(owner_device_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS protocol_points_log (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_fid   INTEGER,
      device_id   TEXT,
      action      TEXT NOT NULL,
      points      INTEGER NOT NULL,
      meta        JSONB,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ppl_fid    ON protocol_points_log(owner_fid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ppl_device ON protocol_points_log(device_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      code          TEXT PRIMARY KEY,
      owner_fid     INTEGER,
      owner_device_id TEXT,
      uses          INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ── Alter weeks ────────────────────────────────────────────────────────────
  await sql`ALTER TABLE weeks ADD COLUMN IF NOT EXISTS pro_threshold NUMERIC`;
  await sql`ALTER TABLE weeks ADD COLUMN IF NOT EXISTS lock_at TIMESTAMPTZ`;

  // ── Alter weekly_teams — new slot columns ──────────────────────────────────
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS casts_fid      INTEGER REFERENCES cards(fid)`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS replies_fid    INTEGER REFERENCES cards(fid)`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS followers_fid  INTEGER REFERENCES cards(fid)`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS score_rise_fid INTEGER REFERENCES cards(fid)`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS likes_fid      INTEGER REFERENCES cards(fid)`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS chosen_tier    TEXT NOT NULL DEFAULT 'beginner'`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS assigned_group TEXT`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS avg_team_score NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS slot_points    INTEGER NOT NULL DEFAULT 0`;
  // Stored at lock-in: follower_count and neynar_score per relevant FID
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS followers_baseline INTEGER`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS score_baseline     NUMERIC`;

  return NextResponse.json({ ok: true, migration: 'league' });
}
