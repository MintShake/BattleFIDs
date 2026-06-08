import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAddress } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const address = req.headers.get('x-wallet-address') ?? '';
  if (!isAdminAddress(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const b = await req.json();

  try {
    // If marking as default, clear existing first
    if (b.is_default) {
      await sql`UPDATE editions SET is_default = FALSE, updated_at = NOW()`;
    }

    await sql`
      UPDATE editions SET
        name             = COALESCE(${b.name             ?? null}, name),
        is_active        = COALESCE(${b.is_active        ?? null}, is_active),
        is_default       = COALESCE(${b.is_default       ?? null}, is_default),
        sort_order       = COALESCE(${b.sort_order       ?? null}, sort_order),
        header_era       = COALESCE(${b.header_era       ?? null}, header_era),
        bg_image         = COALESCE(${b.bg_image         ?? null}, bg_image),
        accent_primary   = COALESCE(${b.accent_primary   ?? null}, accent_primary),
        accent_secondary = COALESCE(${b.accent_secondary ?? null}, accent_secondary),
        description      = COALESCE(${b.description      ?? null}, description),
        tag_label        = COALESCE(${b.tag_label        ?? null}, tag_label),
        tag_color        = COALESCE(${b.tag_color        ?? null}, tag_color),
        embed_image_url  = COALESCE(${b.embed_image_url  ?? null}, embed_image_url),
        splash_image_url = COALESCE(${b.splash_image_url ?? null}, splash_image_url),
        rarity_names     = COALESCE(${b.rarity_names  ? JSON.stringify(b.rarity_names)  : null}::jsonb, rarity_names),
        slot_labels      = COALESCE(${b.slot_labels   ? JSON.stringify(b.slot_labels)   : null}::jsonb, slot_labels),
        slot_descs       = COALESCE(${b.slot_descs    ? JSON.stringify(b.slot_descs)    : null}::jsonb, slot_descs),
        pack_names       = COALESCE(${b.pack_names    ? JSON.stringify(b.pack_names)    : null}::jsonb, pack_names),
        captain_mults    = COALESCE(${b.captain_mults ? JSON.stringify(b.captain_mults) : null}::jsonb, captain_mults),
        log_maxes        = COALESCE(${b.log_maxes     ? JSON.stringify(b.log_maxes)     : null}::jsonb, log_maxes),
        season_label     = COALESCE(${b.season_label     ?? null}, season_label),
        rules            = COALESCE(${b.rules            ?? null}, rules),
        updated_at       = NOW()
      WHERE id = ${id}
    `;

    const [row] = await sql`SELECT * FROM editions WHERE id = ${id}`;
    return NextResponse.json({ ok: true, edition: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const address = req.headers.get('x-wallet-address') ?? '';
  if (!isAdminAddress(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Soft-delete: just mark inactive
    await sql`UPDATE editions SET is_active = FALSE, updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
