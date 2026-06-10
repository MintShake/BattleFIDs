import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  await sql`
    UPDATE editions
    SET rarity_names = '{"Alpha":"GENESIS","Legendary":"ORACLE","Elite":"NODE","Rare":"VALIDATOR","Common":"CASTER"}'::jsonb
    WHERE id = 'base'
  `;
  return NextResponse.json({ ok: true });
}
