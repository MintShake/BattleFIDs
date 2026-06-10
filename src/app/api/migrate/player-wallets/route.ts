import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
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

  // Migrate existing wallet_address rows from players table
  await sql`
    INSERT INTO player_wallets (owner_fid, owner_device_id, wallet_address, linked_fid)
    SELECT owner_fid, owner_device_id, wallet_address, linked_fid
    FROM players
    WHERE wallet_address IS NOT NULL
    ON CONFLICT (wallet_address) DO NOTHING
  `;

  return NextResponse.json({ ok: true });
}
