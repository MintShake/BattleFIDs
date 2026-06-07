import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/migrate — run once to create tables. Guard with a secret in prod.
export async function GET() {
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
      stored_at       TIMESTAMPTZ NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS packs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_fid       INTEGER,
      owner_device_id TEXT,
      opened_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

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
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_device ON owned_cards(owner_device_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_owned_cards_image ON owned_cards(image_id)`;

  return NextResponse.json({ ok: true });
}
