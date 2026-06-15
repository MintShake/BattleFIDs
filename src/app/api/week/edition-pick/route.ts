import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId } from '@/lib/weeklyScoring';
import { canUnlockEdition, pointsRequiredForEdition } from '@/lib/editionUnlocks';

// GET /api/week/edition-pick?ownerFid=X  OR  ?ownerDeviceId=X
// Returns the player's current edition pick(s) for this week.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');
  const weekId        = searchParams.get('weekId') ?? currentWeekId();
  const editionId     = searchParams.get('editionId');
  const slotKeyParam  = searchParams.get('slotKey');

  if (editionId && !ownerFid && !ownerDeviceId) {
    try {
      const slotRows = slotKeyParam
        ? await sql`
            SELECT * FROM edition_bonus_slots
            WHERE edition_id = ${editionId} AND slot_key = ${slotKeyParam} AND active = TRUE
            ORDER BY sort_order LIMIT 1
          `
        : await sql`
            SELECT * FROM edition_bonus_slots
            WHERE edition_id = ${editionId} AND active = TRUE
            ORDER BY sort_order LIMIT 1
          `;
      const slot = slotRows[0] ?? null;
      if (!slot) return NextResponse.json({ weekId, editionId, leaderboard: [], totalPicks: 0, slot: null });

      const rows = await sql`
        SELECT ep.owner_fid, ep.owner_device_id, ep.card_fid, ep.preview_value,
               ep.score_value, ep.slot_points, ep.rank, ep.preview_updated_at,
               c.handle, c.thumb_url, c.rarity
        FROM weekly_edition_picks ep
        LEFT JOIN cards c ON c.fid = ep.card_fid
        WHERE ep.week_id = ${weekId}
          AND ep.edition_id = ${editionId}
          AND ep.slot_key = ${slot.slot_key}
        ORDER BY ep.slot_points DESC, ep.score_value DESC NULLS LAST, ep.preview_value DESC NULLS LAST, ep.updated_at ASC
        LIMIT 50
      `;

      return NextResponse.json({
        weekId,
        editionId,
        slot: {
          slotKey:     slot.slot_key,
          label:       slot.label,
          emoji:       slot.emoji,
          description: slot.description,
          metricType:  slot.metric_type,
        },
        leaderboard: rows.map((r, i) => ({
          rank:        r.rank ? Number(r.rank) : i + 1,
          ownerFid:    r.owner_fid ? Number(r.owner_fid) : null,
          cardFid:     Number(r.card_fid),
          handle:      r.handle ?? null,
          thumb:       r.thumb_url ?? null,
          rarity:      r.rarity ?? null,
          value:       r.score_value != null ? Number(r.score_value) : r.preview_value != null ? Number(r.preview_value) : null,
          slotPoints:  Number(r.slot_points ?? 0),
          previewedAt: r.preview_updated_at ?? null,
        })),
        totalPicks: rows.length,
      });
    } catch {
      return NextResponse.json({ weekId, editionId, leaderboard: [], totalPicks: 0, slot: null });
    }
  }

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
// Edition-locked in UI and API by Protocol Points threshold.
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

    // Edition slots unlock at per-edition Protocol Points thresholds.
    const playerRows = fid
      ? await sql`SELECT protocol_points FROM players WHERE owner_fid = ${fid}`
      : await sql`SELECT protocol_points FROM players WHERE owner_device_id = ${device}`;
    const player = playerRows[0];
    const protocolPoints = Number(player?.protocol_points ?? 0);
    if (!canUnlockEdition(editionId, protocolPoints)) {
      return NextResponse.json({
        error: `edition locked until ${pointsRequiredForEdition(editionId)} Protocol Points`,
      }, { status: 403 });
    }

    // Validate ownership
    const owned = fid
      ? await sql`SELECT 1 FROM owned_cards WHERE owner_fid = ${fid} AND fid = ${parseInt(cardFid)}`
      : await sql`SELECT 1 FROM owned_cards WHERE owner_device_id = ${device} AND fid = ${parseInt(cardFid)}`;
    if (owned.length === 0) return NextResponse.json({ error: 'card not owned' }, { status: 403 });

    const weekId = currentWeekId();
    const chosenFid = parseInt(cardFid);

    // A card can only be used once across all edition teams and bonus slots.
    const teamRows = fid
      ? await sql`
          SELECT edition_id, casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid
          FROM weekly_teams
          WHERE week_id = ${weekId} AND owner_fid = ${fid}
        `
      : await sql`
          SELECT edition_id, casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid
          FROM weekly_teams
          WHERE week_id = ${weekId} AND owner_device_id = ${device}
        `;
    for (const row of teamRows) {
      const used = [row.casts_fid, row.replies_fid, row.followers_fid, row.score_rise_fid, row.likes_fid]
        .filter(Boolean)
        .map(Number);
      if (used.includes(chosenFid)) {
        return NextResponse.json({ error: 'card already used in a team slot this week' }, { status: 409 });
      }
    }

    const otherPickRows = fid
      ? await sql`
          SELECT card_fid FROM weekly_edition_picks
          WHERE week_id = ${weekId} AND owner_fid = ${fid}
            AND NOT (edition_id = ${editionId} AND slot_key = ${slotKey})
        `
      : await sql`
          SELECT card_fid FROM weekly_edition_picks
          WHERE week_id = ${weekId} AND owner_device_id = ${device}
            AND NOT (edition_id = ${editionId} AND slot_key = ${slotKey})
        `;
    if (otherPickRows.some(r => Number(r.card_fid) === chosenFid)) {
      return NextResponse.json({ error: 'card already used in another edition slot this week' }, { status: 409 });
    }

    if (fid) {
      await sql`
        INSERT INTO weekly_edition_picks
          (week_id, edition_id, slot_key, owner_fid, card_fid, updated_at)
        VALUES
          (${weekId}, ${editionId}, ${slotKey}, ${fid}, ${chosenFid}, NOW())
        ON CONFLICT (week_id, edition_id, slot_key, owner_fid) WHERE owner_fid IS NOT NULL
          DO UPDATE SET card_fid = EXCLUDED.card_fid, updated_at = NOW()
      `;
    } else {
      await sql`
        INSERT INTO weekly_edition_picks
          (week_id, edition_id, slot_key, owner_device_id, card_fid, updated_at)
        VALUES
          (${weekId}, ${editionId}, ${slotKey}, ${device}, ${chosenFid}, NOW())
        ON CONFLICT (week_id, edition_id, slot_key, owner_device_id) WHERE owner_device_id IS NOT NULL
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
