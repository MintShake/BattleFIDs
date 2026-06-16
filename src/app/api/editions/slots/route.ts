import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/editions/slots
// Returns all active bonus slots grouped by edition — accessible to all,
// UI/API restrict play to players who have reached that edition's points threshold.
export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM edition_bonus_slots
      WHERE active = TRUE
      ORDER BY edition_id, sort_order
    `;

    // Group by edition
    const byEdition: Record<string, typeof rows> = {};
    for (const row of rows) {
      const eid = row.edition_id as string;
      if (!byEdition[eid]) byEdition[eid] = [];
      byEdition[eid].push(row);
    }

    const editions = Object.entries(byEdition).map(([editionId, slots]) => ({
      editionId,
      slots: slots.map(s => ({
        id:          s.id,
        editionId:   s.edition_id,
        slotKey:     s.slot_key,
        label:       s.label,
        emoji:       s.emoji,
        description: s.description,
        metricType:  s.metric_type,
        sortOrder:   s.sort_order,
      })),
    }));

    return NextResponse.json({ editions });
  } catch {
    return NextResponse.json({ editions: [] });
  }
}
