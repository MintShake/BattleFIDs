import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId, weekBounds } from '@/lib/weeklyScoring';

// GET /api/week/team?ownerFid=123  OR  ?ownerDeviceId=abc
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid      = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');
  const weekId        = searchParams.get('weekId') ?? currentWeekId();

  try {
    const rows = ownerFid
      ? await sql`
          SELECT wt.*,
            cap.handle AS cap_handle, cap.thumb_url AS cap_thumb, cap.rarity AS cap_rarity,
            bc.handle  AS bc_handle,  bc.thumb_url  AS bc_thumb,  bc.rarity  AS bc_rarity,
            pc.handle  AS pc_handle,  pc.thumb_url  AS pc_thumb,  pc.rarity  AS pc_rarity,
            ag.handle  AS ag_handle,  ag.thumb_url  AS ag_thumb,  ag.rarity  AS ag_rarity,
            nc.handle  AS nc_handle,  nc.thumb_url  AS nc_thumb,  nc.rarity  AS nc_rarity
          FROM weekly_teams wt
          LEFT JOIN cards cap ON cap.fid = wt.captain_fid
          LEFT JOIN cards bc  ON bc.fid  = wt.broadcaster_fid
          LEFT JOIN cards pc  ON pc.fid  = wt.publisher_fid
          LEFT JOIN cards ag  ON ag.fid  = wt.agitator_fid
          LEFT JOIN cards nc  ON nc.fid  = wt.networker_fid
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

    let scores: Record<string, number> = {};
    if (team) {
      const fids = [
        team.captain_fid, team.broadcaster_fid,
        team.publisher_fid, team.agitator_fid, team.networker_fid,
      ].filter(Boolean) as number[];

      if (fids.length > 0) {
        const scoreRows = await sql`
          SELECT fid, normalized_score
          FROM weekly_card_scores
          WHERE week_id = ${weekId} AND fid = ANY(${fids}::int[])
        `;
        scores = Object.fromEntries(scoreRows.map(r => [String(r.fid), Number(r.normalized_score)]));
      }
    }

    return NextResponse.json({ team, scores, weekId });
  } catch {
    return NextResponse.json({ team: null, scores: {}, weekId });
  }
}

// POST /api/week/team
// Body: { ownerFid?, ownerDeviceId?, captainFid, broadcasterFid, publisherFid, agitatorFid, networkerFid, wagerUsdc? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerFid, ownerDeviceId, captainFid, broadcasterFid, publisherFid, agitatorFid, networkerFid, wagerUsdc = 0 } = body;

    if (!ownerFid && !ownerDeviceId) return NextResponse.json({ error: 'owner required' }, { status: 400 });
    if (!captainFid || !broadcasterFid || !publisherFid || !agitatorFid || !networkerFid) {
      return NextResponse.json({ error: 'all 5 slots required' }, { status: 400 });
    }

    const weekId = currentWeekId();
    const { start, end } = weekBounds(weekId);

    await sql`
      INSERT INTO weeks (id, starts_at, ends_at)
      VALUES (${weekId}, ${start.toISOString()}, ${end.toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;

    // Verify caller owns all 5 cards
    const fids = [captainFid, broadcasterFid, publisherFid, agitatorFid, networkerFid] as number[];
    const owned = ownerFid
      ? await sql`
          SELECT DISTINCT fid FROM owned_cards
          WHERE owner_fid = ${ownerFid} AND fid = ANY(${fids}::int[])
        `
      : await sql`
          SELECT DISTINCT fid FROM owned_cards
          WHERE owner_device_id = ${ownerDeviceId} AND fid = ANY(${fids}::int[])
        `;

    const ownedFids = new Set(owned.map(r => Number(r.fid)));
    const missing = fids.filter(f => !ownedFids.has(f));
    if (missing.length > 0) return NextResponse.json({ error: 'you do not own all selected cards' }, { status: 403 });

    if (ownerFid) {
      await sql`
        INSERT INTO weekly_teams (week_id, owner_fid, captain_fid, broadcaster_fid, publisher_fid, agitator_fid, networker_fid, wager_usdc, updated_at)
        VALUES (${weekId}, ${ownerFid}, ${captainFid}, ${broadcasterFid}, ${publisherFid}, ${agitatorFid}, ${networkerFid}, ${wagerUsdc}, NOW())
        ON CONFLICT (week_id, owner_fid) DO UPDATE SET
          captain_fid     = EXCLUDED.captain_fid,
          broadcaster_fid = EXCLUDED.broadcaster_fid,
          publisher_fid   = EXCLUDED.publisher_fid,
          agitator_fid    = EXCLUDED.agitator_fid,
          networker_fid   = EXCLUDED.networker_fid,
          wager_usdc      = EXCLUDED.wager_usdc,
          updated_at      = NOW()
      `;
    } else {
      await sql`
        INSERT INTO weekly_teams (week_id, owner_device_id, captain_fid, broadcaster_fid, publisher_fid, agitator_fid, networker_fid, wager_usdc, updated_at)
        VALUES (${weekId}, ${ownerDeviceId}, ${captainFid}, ${broadcasterFid}, ${publisherFid}, ${agitatorFid}, ${networkerFid}, ${wagerUsdc}, NOW())
        ON CONFLICT (week_id, owner_device_id) DO UPDATE SET
          captain_fid     = EXCLUDED.captain_fid,
          broadcaster_fid = EXCLUDED.broadcaster_fid,
          publisher_fid   = EXCLUDED.publisher_fid,
          agitator_fid    = EXCLUDED.agitator_fid,
          networker_fid   = EXCLUDED.networker_fid,
          wager_usdc      = EXCLUDED.wager_usdc,
          updated_at      = NOW()
      `;
    }

    return NextResponse.json({ ok: true, weekId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
