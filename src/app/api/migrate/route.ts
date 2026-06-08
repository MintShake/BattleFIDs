import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { EDITION_SEEDS } from '@/lib/editionDb';

// GET /api/migrate — idempotent, safe to re-run
export async function GET() {
  // ── Core tables ────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS cards (
      image_id        TEXT PRIMARY KEY,
      fid             INTEGER NOT NULL,
      pfp_url         TEXT NOT NULL,
      thumb_url       TEXT NOT NULL,
      handle          TEXT NOT NULL,
      display_name    TEXT NOT NULL,
      max_supply      INTEGER NOT NULL,
      variant_index   INTEGER NOT NULL,
      total_variants  INTEGER NOT NULL,
      rarity          TEXT NOT NULL,
      stats           JSONB NOT NULL,
      battle_score    INTEGER NOT NULL,
      like_count      INTEGER NOT NULL DEFAULT 0,
      has_badge       BOOLEAN NOT NULL DEFAULT FALSE,
      stored_at       TIMESTAMPTZ NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE cards ADD COLUMN IF NOT EXISTS like_count    INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE cards ADD COLUMN IF NOT EXISTS has_badge     BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type     TEXT    NOT NULL DEFAULT 'NETWORKER'`;
  await sql`ALTER TABLE cards ADD COLUMN IF NOT EXISTS wins          INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE cards ADD COLUMN IF NOT EXISTS losses        INTEGER NOT NULL DEFAULT 0`;

  await sql`
    CREATE TABLE IF NOT EXISTS packs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_fid       INTEGER,
      owner_device_id TEXT,
      tier            TEXT NOT NULL DEFAULT 'scroll',
      opened_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE packs ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'scroll'`;

  await sql`
    CREATE TABLE IF NOT EXISTS owned_cards (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pack_id         UUID REFERENCES packs(id),
      image_id        TEXT NOT NULL REFERENCES cards(image_id),
      owner_fid       INTEGER,
      owner_device_id TEXT,
      serial_number   INTEGER NOT NULL,
      opened_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_owner_fid ON owned_cards(owner_fid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_device    ON owned_cards(owner_device_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_image     ON owned_cards(image_id)`;

  // ── League tables ──────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS weeks (
      id          TEXT PRIMARY KEY,         -- '2026-W23'
      starts_at   TIMESTAMPTZ NOT NULL,
      ends_at     TIMESTAMPTZ NOT NULL,
      computed_at TIMESTAMPTZ               -- null until scores finalised
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS weekly_teams (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id              TEXT NOT NULL REFERENCES weeks(id),
      owner_fid            INTEGER,
      owner_device_id      TEXT,
      captain_image_id     TEXT REFERENCES cards(image_id),
      broadcaster_image_id TEXT REFERENCES cards(image_id),
      publisher_image_id   TEXT REFERENCES cards(image_id),
      agitator_image_id    TEXT REFERENCES cards(image_id),
      networker_image_id   TEXT REFERENCES cards(image_id),
      total_score          NUMERIC NOT NULL DEFAULT 0,
      rank                 INTEGER,
      updated_at           TIMESTAMPTZ DEFAULT NOW(),
      wager_usdc           NUMERIC NOT NULL DEFAULT 0,   -- 0 = free entry
      xplora_credits_won   INTEGER NOT NULL DEFAULT 0,   -- awarded at end of week
      UNIQUE(week_id, owner_fid),
      UNIQUE(week_id, owner_device_id)
    )
  `;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS wager_usdc         NUMERIC NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE weekly_teams ADD COLUMN IF NOT EXISTS xplora_credits_won INTEGER NOT NULL DEFAULT 0`;

  await sql`
    CREATE TABLE IF NOT EXISTS xplora_balances (
      owner_fid  INTEGER PRIMARY KEY,
      credits    INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_weekly_teams_week ON weekly_teams(week_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS weekly_card_scores (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id          TEXT NOT NULL,
      fid              INTEGER NOT NULL,
      image_id         TEXT NOT NULL REFERENCES cards(image_id),
      card_type        TEXT NOT NULL,
      raw_score        NUMERIC NOT NULL DEFAULT 0,
      normalized_score NUMERIC NOT NULL DEFAULT 0,
      computed_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(week_id, image_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_wcs_week_fid ON weekly_card_scores(week_id, fid)`;

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

  // Seed the 3 built-in editions (idempotent)
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

  return NextResponse.json({ ok: true });
}
