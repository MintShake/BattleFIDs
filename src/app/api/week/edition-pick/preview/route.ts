import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchBonusMetric } from '@/lib/neynar';
import { currentWeekId, weekBounds } from '@/lib/weeklyScoring';

// POST /api/week/edition-pick/preview
// Fetches live metric for the player's edition bonus slot pick, stores it,
// and returns value + comparison among other Pro players on the same slot.
export async function POST(req: NextRequest) {
  try {
    const { ownerFid, ownerDeviceId } = await req.json();
    const fid    = ownerFid    ? parseInt(ownerFid)    : null;
    const device = ownerDeviceId ?? null;

    if (!fid && !device) return NextResponse.json({ error: 'owner required' }, { status: 400 });

    const weekId = currentWeekId();
    const { start: weekStart } = weekBounds(weekId);

    // Load this player's edition picks for the week
    const picks = fid
      ? await sql`
          SELECT ep.*, ebs.metric_type
          FROM weekly_edition_picks ep
          JOIN edition_bonus_slots ebs ON ebs.id = ep.edition_id || ':' || ep.slot_key
          WHERE ep.week_id = ${weekId} AND ep.owner_fid = ${fid}
        `
      : await sql`
          SELECT ep.*, ebs.metric_type
          FROM weekly_edition_picks ep
          JOIN edition_bonus_slots ebs ON ebs.id = ep.edition_id || ':' || ep.slot_key
          WHERE ep.week_id = ${weekId} AND ep.owner_device_id = ${device}
        `;

    if (picks.length === 0) return NextResponse.json({ previews: [] });

    const previews = [];

    for (const pick of picks) {
      const cardFid    = Number(pick.card_fid);
      const metricType = pick.metric_type as string;
      const editionId  = pick.edition_id as string;
      const slotKey    = pick.slot_key as string;

      // Fetch live metric
      const myValue = await fetchBonusMetric(cardFid, metricType, weekStart);

      // Persist snapshot
      if (fid) {
        await sql`
          UPDATE weekly_edition_picks
          SET preview_value = ${myValue}, preview_updated_at = NOW()
          WHERE week_id = ${weekId} AND edition_id = ${editionId}
            AND slot_key = ${slotKey} AND owner_fid = ${fid}
        `;
      } else {
        await sql`
          UPDATE weekly_edition_picks
          SET preview_value = ${myValue}, preview_updated_at = NOW()
          WHERE week_id = ${weekId} AND edition_id = ${editionId}
            AND slot_key = ${slotKey} AND owner_device_id = ${device}
        `;
      }

      // Compare against all other picks on this edition+slot that have previewed
      const peers = await sql`
        SELECT preview_value
        FROM weekly_edition_picks
        WHERE week_id = ${weekId}
          AND edition_id = ${editionId}
          AND slot_key = ${slotKey}
          AND preview_updated_at IS NOT NULL
      `;

      const totalOnSlot = await sql`
        SELECT COUNT(*) AS count
        FROM weekly_edition_picks
        WHERE week_id = ${weekId} AND edition_id = ${editionId} AND slot_key = ${slotKey}
      `;

      const beating  = peers.filter(p => Number(p.preview_value ?? -1) < myValue).length;
      const compared = peers.length;

      previews.push({
        editionId,
        slotKey,
        value:        myValue,
        beating,
        compared,
        totalOnSlot:  Number(totalOnSlot[0]?.count ?? 0),
        updatedAt:    new Date().toISOString(),
      });
    }

    return NextResponse.json({ previews });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
