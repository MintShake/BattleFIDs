import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS player_wallets (
        id               SERIAL PRIMARY KEY,
        owner_fid        INTEGER,
        owner_device_id  TEXT,
        wallet_address   TEXT NOT NULL,
        linked_fid       INTEGER,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(wallet_address)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_pw_fid    ON player_wallets(owner_fid)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pw_device ON player_wallets(owner_device_id)`;

    // Ensure players table has wallet columns before backfilling
    await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS wallet_address TEXT`;
    await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS linked_fid INTEGER`;

    // Backfill from players table
    await sql`
      INSERT INTO player_wallets (owner_fid, owner_device_id, wallet_address, linked_fid)
      SELECT owner_fid, owner_device_id, wallet_address, linked_fid
      FROM players
      WHERE wallet_address IS NOT NULL
      ON CONFLICT (wallet_address) DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
