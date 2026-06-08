import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAddress } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM editions
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, created_at ASC
    `;
    const defaultRow = rows.find(r => r.is_default) ?? rows[0];
    return NextResponse.json({ editions: rows, defaultId: defaultRow?.id ?? 'base' });
  } catch {
    return NextResponse.json({ editions: [], defaultId: 'base' });
  }
}

export async function POST(req: NextRequest) {
  const address = req.headers.get('x-wallet-address') ?? '';
  if (!isAdminAddress(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const b = await req.json();

    // Validate required fields
    if (!b.id || !b.name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/.test(b.id)) {
      return NextResponse.json({ error: 'id must be lowercase alphanumeric + hyphens' }, { status: 400 });
    }

    // If marking as default, clear existing default first
    if (b.is_default) {
      await sql`UPDATE editions SET is_default = FALSE, updated_at = NOW()`;
    }

    await sql`
      INSERT INTO editions (
        id, name, is_active, is_default, sort_order,
        header_era, bg_image, accent_primary, accent_secondary,
        description, tag_label, tag_color,
        embed_image_url, splash_image_url,
        rarity_names, slot_labels, slot_descs, pack_names,
        captain_mults, log_maxes, season_label, rules
      ) VALUES (
        ${b.id}, ${b.name}, TRUE, ${b.is_default ?? false}, ${b.sort_order ?? 99},
        ${b.header_era ?? ''}, ${b.bg_image ?? '/bg-roman.png'}, ${b.accent_primary ?? '#8a63d2'}, ${b.accent_secondary ?? '#3a9bdc'},
        ${b.description ?? ''}, ${b.tag_label ?? 'NEW'}, ${b.tag_color ?? '#8a63d2'},
        ${b.embed_image_url ?? null}, ${b.splash_image_url ?? null},
        ${JSON.stringify(b.rarity_names ?? {})}::jsonb,
        ${JSON.stringify(b.slot_labels  ?? {})}::jsonb,
        ${JSON.stringify(b.slot_descs   ?? {})}::jsonb,
        ${JSON.stringify(b.pack_names   ?? {})}::jsonb,
        ${JSON.stringify(b.captain_mults ?? {})}::jsonb,
        ${JSON.stringify(b.log_maxes     ?? {})}::jsonb,
        ${b.season_label ?? ''}, ${b.rules ?? ''}
      )
    `;

    const [row] = await sql`SELECT * FROM editions WHERE id = ${b.id}`;
    return NextResponse.json({ ok: true, edition: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
