import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { EDITION_SEEDS } from '@/lib/editionDb';

// GET /api/migrate — resets all data tables and applies current schema.
// Safe to re-run; editions table is preserved and re-seeded idempotently.
export async function GET() {
  // ── Drop data tables (clean reset) ────────────────────────────────────────
  await sql`DROP TABLE IF EXISTS weekly_card_scores CASCADE`;
  await sql`DROP TABLE IF EXISTS daily_spins CASCADE`;
  await sql`DROP TABLE IF EXISTS weekly_teams CASCADE`;
  await sql`DROP TABLE IF EXISTS xplora_balances CASCADE`;
  await sql`DROP TABLE IF EXISTS weeks CASCADE`;
  await sql`DROP TABLE IF EXISTS edition_1of1s CASCADE`;
  await sql`DROP TABLE IF EXISTS owned_cards CASCADE`;
  await sql`DROP TABLE IF EXISTS packs CASCADE`;
  await sql`DROP TABLE IF EXISTS cards CASCADE`;

  // ── Core tables ────────────────────────────────────────────────────────────

  // One row per FID — the card IS the FID, not a specific PFP image
  await sql`
    CREATE TABLE cards (
      fid             INTEGER PRIMARY KEY,
      pfp_url         TEXT NOT NULL,
      pfp_urls        TEXT[] NOT NULL DEFAULT '{}',
      thumb_url       TEXT NOT NULL,
      handle          TEXT NOT NULL,
      display_name    TEXT NOT NULL,
      max_supply      INTEGER NOT NULL,
      rarity          TEXT NOT NULL,
      stats           JSONB NOT NULL,
      battle_score    INTEGER NOT NULL,
      like_count      INTEGER NOT NULL DEFAULT 0,
      has_badge       BOOLEAN NOT NULL DEFAULT FALSE,
      card_type       TEXT NOT NULL DEFAULT 'NETWORKER',
      wins            INTEGER NOT NULL DEFAULT 0,
      losses          INTEGER NOT NULL DEFAULT 0,
      stored_at       TIMESTAMPTZ NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE packs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_fid       INTEGER,
      owner_device_id TEXT,
      tier            TEXT NOT NULL DEFAULT 'scroll',
      opened_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE owned_cards (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pack_id         UUID REFERENCES packs(id),
      fid             INTEGER NOT NULL REFERENCES cards(fid),
      owner_fid       INTEGER,
      owner_device_id TEXT,
      serial_number   INTEGER NOT NULL,
      is_edition_1of1 BOOLEAN NOT NULL DEFAULT FALSE,
      edition_id      TEXT,
      opened_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_owner_fid ON owned_cards(owner_fid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_device    ON owned_cards(owner_device_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_fid       ON owned_cards(fid)`;

  // Edition 1/1s — one special card per FID per edition, pulled from packs
  await sql`
    CREATE TABLE edition_1of1s (
      fid             INTEGER NOT NULL,
      edition_id      TEXT    NOT NULL,
      claimed         BOOLEAN NOT NULL DEFAULT FALSE,
      pack_id         UUID    REFERENCES packs(id),
      owner_fid       INTEGER,
      owner_device_id TEXT,
      PRIMARY KEY (fid, edition_id)
    )
  `;

  // ── League tables ──────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE weeks (
      id          TEXT PRIMARY KEY,
      starts_at   TIMESTAMPTZ NOT NULL,
      ends_at     TIMESTAMPTZ NOT NULL,
      computed_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE weekly_teams (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id          TEXT NOT NULL REFERENCES weeks(id),
      edition_id       TEXT NOT NULL DEFAULT 'base',
      owner_fid        INTEGER,
      owner_device_id  TEXT,
      captain_fid      INTEGER REFERENCES cards(fid),
      broadcaster_fid  INTEGER REFERENCES cards(fid),
      publisher_fid    INTEGER REFERENCES cards(fid),
      agitator_fid     INTEGER REFERENCES cards(fid),
      networker_fid    INTEGER REFERENCES cards(fid),
      total_score      NUMERIC NOT NULL DEFAULT 0,
      rank             INTEGER,
      wager_usdc       NUMERIC NOT NULL DEFAULT 0,
      xplora_credits_won INTEGER NOT NULL DEFAULT 0,
      updated_at       TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(week_id, owner_fid),
      UNIQUE(week_id, owner_device_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_weekly_teams_week ON weekly_teams(week_id)`;

  await sql`
    CREATE TABLE xplora_balances (
      owner_fid  INTEGER PRIMARY KEY,
      credits    INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE weekly_card_scores (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id          TEXT NOT NULL,
      fid              INTEGER NOT NULL REFERENCES cards(fid),
      card_type        TEXT NOT NULL,
      raw_score        NUMERIC NOT NULL DEFAULT 0,
      normalized_score NUMERIC NOT NULL DEFAULT 0,
      computed_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(week_id, fid)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_wcs_week_fid ON weekly_card_scores(week_id, fid)`;

  await sql`
    CREATE TABLE daily_spins (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_fid       INTEGER,
      owner_device_id TEXT,
      spin_day        TEXT NOT NULL,
      points_awarded  INTEGER NOT NULL DEFAULT 0,
      outcome_label   TEXT NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(owner_fid, spin_day),
      UNIQUE(owner_device_id, spin_day)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_daily_spins_fid_day ON daily_spins(owner_fid, spin_day)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_daily_spins_device_day ON daily_spins(owner_device_id, spin_day)`;

  // ── Editions table ─────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS editions (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      is_active        BOOLEAN NOT NULL DEFAULT TRUE,
      is_default       BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      header_era       TEXT NOT NULL DEFAULT '',
      bg_image         TEXT NOT NULL DEFAULT '/bg-roman.png',
      accent_primary   TEXT NOT NULL DEFAULT '#8a63d2',
      accent_secondary TEXT NOT NULL DEFAULT '#3a9bdc',
      description      TEXT NOT NULL DEFAULT '',
      tag_label        TEXT NOT NULL DEFAULT 'LIVE',
      tag_color        TEXT NOT NULL DEFAULT '#22c55e',
      embed_image_url  TEXT,
      splash_image_url TEXT,
      rarity_names     JSONB NOT NULL DEFAULT '{}',
      slot_labels      JSONB NOT NULL DEFAULT '{}',
      slot_descs       JSONB NOT NULL DEFAULT '{}',
      pack_names       JSONB NOT NULL DEFAULT '{}',
      captain_mults    JSONB NOT NULL DEFAULT '{}',
      log_maxes        JSONB NOT NULL DEFAULT '{}',
      season_label     TEXT NOT NULL DEFAULT '',
      rules            TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  for (const s of EDITION_SEEDS) {
    await sql`
      INSERT INTO editions (
        id, name, is_active, is_default, sort_order,
        header_era, bg_image, accent_primary, accent_secondary,
        description, tag_label, tag_color,
        embed_image_url, splash_image_url,
        rarity_names, slot_labels, slot_descs, pack_names,
        captain_mults, log_maxes, season_label, rules
      ) VALUES (
        ${s.id}, ${s.name}, TRUE, ${s.is_default}, ${s.sort_order},
        ${s.header_era}, ${s.bg_image}, ${s.accent_primary}, ${s.accent_secondary},
        ${s.description}, ${s.tag_label}, ${s.tag_color},
        ${s.embed_image_url}, ${s.splash_image_url},
        ${s.rarity_names}::jsonb, ${s.slot_labels}::jsonb, ${s.slot_descs}::jsonb, ${s.pack_names}::jsonb,
        ${s.captain_mults}::jsonb, ${s.log_maxes}::jsonb, ${s.season_label}, ${s.rules}
      ) ON CONFLICT (id) DO NOTHING
    `;
  }

  return NextResponse.json({ ok: true, reset: true });
}
