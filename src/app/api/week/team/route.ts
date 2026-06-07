import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId, weekBounds } from '@/lib/weeklyScoring';

// GET /api/week/team?ownerFid=123  OR  ?ownerDeviceId=abc
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');
  const weekId        = searchParams.get('weekId') ?? currentWeekId();

  const rows = ownerFid
    ? await sql`
        SELECT wt.*,
          cap.*, cap.image_id AS cap_image_id, cap.card_type AS cap_type, cap.rarity AS cap_rarity,
          bc.image_id AS bc_image_id, bc.handle AS bc_handle, bc.pfp_url AS bc_pfp, bc.rarity AS bc_rarity,
          pc.image_id AS pc_image_id, pc.handle AS pc_handle, pc.pfp_url AS pc_pfp, pc.rarity AS pc_rarity,
          ag.image_id AS ag_image_id, ag.handle AS ag_handle, ag.pfp_url AS ag_pfp, ag.rarity AS ag_rarity,
          nc.image_id AS nc_image_id, nc.handle AS nc_handle, nc.pfp_url AS nc_pfp, nc.rarity AS nc_rarity
        FROM weekly_teams wt
        LEFT JOIN cards cap ON cap.image_id = wt.captain_image_id
        LEFT JOIN cards bc  ON bc.image_id  = wt.broadcaster_image_id
        LEFT JOIN cards pc  ON pc.image_id  = wt.publisher_image_id
        LEFT JOIN cards ag  ON ag.image_id  = wt.agitator_image_id
        LEFT JOIN cards nc  ON nc.image_id  = wt.networker_image_id
        WHERE wt.week_id = ${weekId} AND wt.owner_fid = ${parseInt(ownerFid)}
      `
    : ownerDeviceId
    ? await sql`
        SELECT wt.*
        FROM weekly_teams wt
        WHERE wt.week_id = ${weekId} AND wt.owner_device_id = ${ownerDeviceId}
      `
    : [];

  const team = rows[0] ?? null;

  // Also return current week scores for this team's cards
  let scores: Record<string, number> = {};
  if (team) {
    const imageIds = [
      team.captain_image_id, team.broadcaster_image_id,
      team.publisher_image_id, team.agitator_image_id, team.networker_image_id,
    ].filter(Boolean);

    if (imageIds.length > 0) {
      const scoreRows = await sql`
        SELECT image_id, normalized_score
        FROM weekly_card_scores
        WHERE week_id = ${weekId} AND image_id = ANY(${imageIds}::text[])
      `;
      scores = Object.fromEntries(scoreRows.map(r => [r.image_id, Number(r.normalized_score)]));
    }
  }

  return NextResponse.json({ team, scores, weekId });
}

// POST /api/week/team — save / update team for current week
// Body: { ownerFid?, ownerDeviceId?, captainImageId, broadcasterImageId, publisherImageId, agitatorImageId, networkerImageId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerFid, ownerDeviceId, captainImageId, broadcasterImageId, publisherImageId, agitatorImageId, networkerImageId, wagerUsdc = 0 } = body;

    if (!ownerFid && !ownerDeviceId) return NextResponse.json({ error: 'owner required' }, { status: 400 });
    if (!captainImageId || !broadcasterImageId || !publisherImageId || !agitatorImageId || !networkerImageId) {
      return NextResponse.json({ error: 'all 5 slots required' }, { status: 400 });
    }

    const weekId = currentWeekId();
    const { start, end } = weekBounds(weekId);

    // Ensure week row exists
    await sql`
      INSERT INTO weeks (id, starts_at, ends_at)
      VALUES (${weekId}, ${start.toISOString()}, ${end.toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;

    // Verify caller owns all 5 cards
    const imageIds = [captainImageId, broadcasterImageId, publisherImageId, agitatorImageId, networkerImageId];
    const owned = ownerFid
      ? await sql`
          SELECT DISTINCT image_id FROM owned_cards
          WHERE owner_fid = ${ownerFid} AND image_id = ANY(${imageIds}::text[])
        `
      : await sql`
          SELECT DISTINCT image_id FROM owned_cards
          WHERE owner_device_id = ${ownerDeviceId} AND image_id = ANY(${imageIds}::text[])
        `;

    const ownedIds = new Set(owned.map(r => r.image_id));
    const missing = imageIds.filter(id => !ownedIds.has(id));
    if (missing.length > 0) return NextResponse.json({ error: 'you do not own all selected cards' }, { status: 403 });

    // Upsert team
    if (ownerFid) {
      await sql`
        INSERT INTO weekly_teams (week_id, owner_fid, captain_image_id, broadcaster_image_id, publisher_image_id, agitator_image_id, networker_image_id, updated_at)
        VALUES (${weekId}, ${ownerFid}, ${captainImageId}, ${broadcasterImageId}, ${publisherImageId}, ${agitatorImageId}, ${networkerImageId}, NOW())
        ON CONFLICT (week_id, owner_fid) DO UPDATE SET
          captain_image_id     = EXCLUDED.captain_image_id,
          broadcaster_image_id = EXCLUDED.broadcaster_image_id,
          publisher_image_id   = EXCLUDED.publisher_image_id,
          agitator_image_id    = EXCLUDED.agitator_image_id,
          networker_image_id   = EXCLUDED.networker_image_id,
          wager_usdc           = EXCLUDED.wager_usdc,
          updated_at           = NOW()
      `;
    } else {
      await sql`
        INSERT INTO weekly_teams (week_id, owner_device_id, captain_image_id, broadcaster_image_id, publisher_image_id, agitator_image_id, networker_image_id, wager_usdc, updated_at)
        VALUES (${weekId}, ${ownerDeviceId}, ${captainImageId}, ${broadcasterImageId}, ${publisherImageId}, ${agitatorImageId}, ${networkerImageId}, ${wagerUsdc}, NOW())
        ON CONFLICT (week_id, owner_device_id) DO UPDATE SET
          captain_image_id     = EXCLUDED.captain_image_id,
          broadcaster_image_id = EXCLUDED.broadcaster_image_id,
          publisher_image_id   = EXCLUDED.publisher_image_id,
          agitator_image_id    = EXCLUDED.agitator_image_id,
          networker_image_id   = EXCLUDED.networker_image_id,
          wager_usdc           = EXCLUDED.wager_usdc,
          updated_at           = NOW()
      `;
    }

    return NextResponse.json({ ok: true, weekId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
