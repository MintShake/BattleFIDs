import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/migrate/edition-slots — safe to re-run
export async function GET() {
  try {
    // Bonus slot definitions per edition
    await sql`
      CREATE TABLE IF NOT EXISTS edition_bonus_slots (
        id           TEXT PRIMARY KEY,
        edition_id   TEXT NOT NULL,
        slot_key     TEXT NOT NULL,
        label        TEXT NOT NULL,
        emoji        TEXT NOT NULL DEFAULT '⚡',
        description  TEXT NOT NULL DEFAULT '',
        metric_type  TEXT NOT NULL,
        sort_order   INT  DEFAULT 0,
        active       BOOL DEFAULT TRUE,
        UNIQUE(edition_id, slot_key)
      )
    `;

    // Weekly picks by players with enough Protocol Points for the edition
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_edition_picks (
        id                  BIGSERIAL PRIMARY KEY,
        week_id             TEXT NOT NULL,
        edition_id          TEXT NOT NULL,
        slot_key            TEXT NOT NULL,
        owner_fid           INT,
        owner_device_id     TEXT,
        card_fid            INT NOT NULL,
        preview_value       INT,
        preview_updated_at  TIMESTAMPTZ,
        score_value         INT,
        slot_points         INT  DEFAULT 0,
        rank                INT,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Unique constraints (separate so they don't conflict during creation)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_edition_pick_fid
        ON weekly_edition_picks (week_id, edition_id, slot_key, owner_fid)
        WHERE owner_fid IS NOT NULL
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_edition_pick_device
        ON weekly_edition_picks (week_id, edition_id, slot_key, owner_device_id)
        WHERE owner_device_id IS NOT NULL
    `;

    // ── Seed bonus slots ──────────────────────────────────────────────────────

    // 2026-rome edition
    await sql`
      INSERT INTO edition_bonus_slots (id, edition_id, slot_key, label, emoji, description, metric_type, sort_order)
      VALUES (
        '2026-rome:total_reactions',
        '2026-rome', 'total_reactions',
        'Total Engagement',
        '🔥',
        'Most likes + recasts received on your casts this week',
        'neynar_total_reactions',
        1
      )
      ON CONFLICT (id) DO NOTHING
    `;

    // builders edition
    await sql`
      INSERT INTO edition_bonus_slots (id, edition_id, slot_key, label, emoji, description, metric_type, sort_order)
      VALUES (
        'builders:embed_casts',
        'builders', 'embed_casts',
        'Mini App Posts',
        '🛠',
        'Casts with links or mini-app embeds published this week',
        'neynar_embed_casts',
        1
      )
      ON CONFLICT (id) DO NOTHING
    `;

    return NextResponse.json({ ok: true, migration: 'edition-slots' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
