import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId } from '@/lib/weeklyScoring';

// GET /api/week/edition-pick?ownerFid=X  OR  ?ownerDeviceId=X
// Returns the player's current edition pick(s) for this week.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');
  const weekId        = searchParams.get('weekId') ?? currentWeekId();

  if (!ownerFid && !ownerDeviceId) return NextResponse.json({ picks: [] });

  try {
    const rows = ownerFid
      ? await sql`
          SELECT ep.*, c.handle, c.thumb_url, c.rarity,
                 ebs.label, ebs.emoji, ebs.description, ebs.metric_type
          FROM weekly_edition_picks ep
          JOIN edition_bonus_slots ebs ON ebs.id = ep.edition_id || ':' || ep.slot_key
          LEFT JOIN cards c ON c.fid = ep.card_fid
          WHERE ep.week_id = ${weekId} AND ep.owner_fid = ${parseInt(ownerFid)}
        `
      : await sql`
          SELECT ep.*, c.handle, c.thumb_url, c.rarity,
                 ebs.label, ebs.emoji, ebs.description, ebs.metric_type
          FROM weekly_edition_picks ep
          JOIN edition_bonus_slots ebs ON ebs.id = ep.edition_id || ':' || ep.slot_key
          LEFT JOIN cards c ON c.fid = ep.card_fid
          WHERE ep.week_id = ${weekId} AND ep.owner_device_id = ${ownerDeviceId}
        `;

    const picks = rows.map(r => ({
      editionId:    r.edition_id,
      slotKey:      r.slot_key,
      cardFid:      Number(r.card_fid),
      handle:       r.handle ?? null,
      thumb:        r.thumb_url ?? null,
      rarity:       r.rarity ?? null,
      label:        r.label,
      emoji:        r.emoji,
      description:  r.description,
      metricType:   r.metric_type,
      previewValue: r.preview_value != null ? Number(r.preview_value) : null,
      previewUpdatedAt: r.preview_updated_at ?? null,
      slotPoints:   Number(r.slot_points ?? 0),
      rank:         r.rank ? Number(r.rank) : null,
    }));

    return NextResponse.json({ picks, weekId });
  } catch {
    return NextResponse.json({ picks: [], weekId });
  }
}

// POST /api/week/edition-pick
// Body: { ownerFid?, ownerDeviceId?, editionId, slotKey, cardFid }
// Pro-only in UI — no server-side Pro check to keep it lightweight.
// Can be called any time during the week (overwrites previous pick).
export async function POST(req: NextRequest) {
  try {
    const { ownerFid, ownerDeviceId, editionId, slotKey, cardFid } = await req.json();

    const fid    = ownerFid    ? parseInt(ownerFid)    : null;
    const device = ownerDeviceId ?? null;

    if (!fid && !device)   return NextResponse.json({ error: 'owner required' },   { status: 400 });
    if (!editionId)        return NextResponse.json({ error: 'editionId required' }, { status: 400 });
    if (!slotKey)          return NextResponse.json({ error: 'slotKey required' },   { status: 400 });
    if (!cardFid)          return NextResponse.json({ error: 'cardFid required' },   { status: 400 });

    // Validate slot exists
    const slotRows = await sql`
      SELECT id FROM edition_bonus_slots
      WHERE edition_id = ${editionId} AND slot_key = ${slotKey} AND active = TRUE
    `;
    if (slotRows.length === 0) return NextResponse.json({ error: 'invalid slot' }, { status: 404 });

    // Validate ownership
    const owned = fid
      ? await sql`SELECT 1 FROM owned_cards WHERE owner_fid = ${fid} AND fid = ${parseInt(cardFid)}`
      : await sql`SELECT 1 FROM owned_cards WHERE owner_device_id = ${device} AND fid = ${parseInt(cardFid)}`;
    if (owned.length === 0) return NextResponse.json({ error: 'card not owned' }, { status: 403 });

    const weekId = currentWeekId();

    // One edition per player per week — clear any picks from other editions first
    if (fid) {
      await sql`
        DELETE FROM weekly_edition_picks
        WHERE week_id = ${weekId} AND owner_fid = ${fid} AND edition_id != ${editionId}
      `;
      await sql`
        INSERT INTO weekly_edition_picks
          (week_id, edition_id, slot_key, owner_fid, card_fid, updated_at)
        VALUES
          (${weekId}, ${editionId}, ${slotKey}, ${fid}, ${parseInt(cardFid)}, NOW())
        ON CONFLICT ON CONSTRAINT uq_edition_pick_fid
          DO UPDATE SET card_fid = EXCLUDED.card_fid, updated_at = NOW()
      `;
    } else {
      await sql`
        DELETE FROM weekly_edition_picks
        WHERE week_id = ${weekId} AND owner_device_id = ${device} AND edition_id != ${editionId}
      `;
      await sql`
        INSERT INTO weekly_edition_picks
          (week_id, edition_id, slot_key, owner_device_id, card_fid, updated_at)
        VALUES
          (${weekId}, ${editionId}, ${slotKey}, ${device}, ${parseInt(cardFid)}, NOW())
        ON CONFLICT ON CONSTRAINT uq_edition_pick_device
          DO UPDATE SET card_fid = EXCLUDED.card_fid, updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true, weekId, editionId, slotKey });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/week/edition-pick?ownerFid=X&editionId=Y&slotKey=Z
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');
  const editionId     = searchParams.get('editionId');
  const slotKey       = searchParams.get('slotKey');
  const weekId        = currentWeekId();

  if (!editionId || !slotKey) return NextResponse.json({ error: 'editionId and slotKey required' }, { status: 400 });

  try {
    if (ownerFid) {
      await sql`DELETE FROM weekly_edition_picks WHERE week_id = ${weekId} AND edition_id = ${editionId} AND slot_key = ${slotKey} AND owner_fid = ${parseInt(ownerFid)}`;
    } else if (ownerDeviceId) {
      await sql`DELETE FROM weekly_edition_picks WHERE week_id = ${weekId} AND edition_id = ${editionId} AND slot_key = ${slotKey} AND owner_device_id = ${ownerDeviceId}`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
