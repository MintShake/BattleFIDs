import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchFaces } from '@/lib/faces';
import { fetchNeynarUsersDirect, fetchCastEngagements } from '@/lib/neynar';
import { buildCard } from '@/lib/cardBuilder';
import { BattleFIDCard, CardType, OwnedCard } from '@/types/card';
import { FidTimeline } from '@/types/faces';
import { PACK_DEFS, PackTier } from '@/lib/packTiers';
import { upsertPlayer, awardPoints } from '@/lib/points';

const PACK_SIZE = 10;
const EDITION_1OF1_CHANCE = 0.015;
const POOL_PER_FETCH = 65;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

// POST /api/packs
// Body: { ownerFid?, ownerDeviceId?, tier? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ownerFid: number | null = body.ownerFid ?? null;
    const ownerDeviceId: string | null = body.ownerDeviceId ?? null;
    const tierId: PackTier = body.tier ?? 'scroll';

    const packDef = PACK_DEFS.find(p => p.id === tierId) ?? PACK_DEFS[0];

    const hasPremiumBands = packDef.bands.some(b => b.pool === 'premium');

    // ── Build random pool: 4 offsets spread across all FIDs ─────────────────
    const probe = await fetchFaces({ limit: 1, offset: 0, imagesPerFid: 1 });
    const total = probe.totalFids;
    const safeMax = Math.max(0, total - POOL_PER_FETCH);

    const offsets = [
      randInt(0,                          Math.floor(safeMax * 0.25)),
      randInt(Math.floor(safeMax * 0.25), Math.floor(safeMax * 0.5)),
      randInt(Math.floor(safeMax * 0.5),  Math.floor(safeMax * 0.75)),
      randInt(Math.floor(safeMax * 0.75), safeMax),
    ];

    const [randomResults, premiumResult] = await Promise.all([
      Promise.all(offsets.map(offset =>
        fetchFaces({ limit: POOL_PER_FETCH, offset, imagesPerFid: 50, sort: 'fid', order: 'asc' })
      )),
      // Premium pool: top accounts by community likes — only fetched when needed
      hasPremiumBands
        ? fetchFaces({ limit: 200, offset: 0, imagesPerFid: 50, sort: 'score', order: 'desc' })
        : Promise.resolve(null),
    ]);

    function dedup(timelines: FidTimeline[], exclude?: Set<number>): FidTimeline[] {
      const seen = new Set<number>(exclude);
      return timelines.filter(tl => !seen.has(tl.fid) && seen.add(tl.fid));
    }

    const rawRandom  = dedup(randomResults.flatMap(r => r.data));
    const rawPremium = premiumResult ? dedup(premiumResult.data) : [];

    // Fetch Neynar in parallel for both pools (batched in chunks of 100)
    const allFids = [...new Set([...rawRandom.map(t => t.fid), ...rawPremium.map(t => t.fid)])];
    const poolNeynarMap = await fetchNeynarUsersDirect(allFids);

    function partialBattleScore(tl: FidTimeline): number {
      const u = poolNeynarMap.get(tl.fid);
      const storedAt = tl.images[0]?.storedAt ?? new Date().toISOString();
      const supplyRarity  = Math.max(0, Math.round(100 * (1 - Math.log10(Math.max(tl.fid, 1)) / 7)));
      const followers     = u?.follower_count ?? 0;
      const followerPower = Math.min(100, Math.round((Math.log10(followers + 1) / Math.log10(1_000_000)) * 100));
      const neynarForce   = Math.min(100, Math.round((u?.score ?? 0) * 100));
      const badge         = (u?.power_badge || (u?.score ?? 0) >= 0.5) ? 40 : 0;
      const badgeSc       = Math.min(100, badge + Math.round((u?.score ?? 0) * 30) + Math.min(2, u?.verifications?.length ?? 0) * 10);
      const daysSince     = (Date.now() - new Date(storedAt).getTime()) / 86_400_000;
      const pfpFreshness  = Math.max(0, Math.round(100 * (1 - daysSince / 365)));
      return Math.round(supplyRarity*0.25 + followerPower*0.20 + neynarForce*0.20 + badgeSc*0.10 + pfpFreshness*0.15);
    }

    // Sort both pools by partial battle score
    const randomPool  = rawRandom.map(tl => ({ timeline: tl, score: partialBattleScore(tl) }))
                                 .sort((a, b) => b.score - a.score);
    const premiumPool = rawPremium.map(tl => ({ timeline: tl, score: partialBattleScore(tl) }))
                                  .sort((a, b) => b.score - a.score);

    // Select cards band by band
    const usedFids = new Set<number>();
    const selectedTimelines: FidTimeline[] = [];

    for (const band of packDef.bands) {
      const src = band.pool === 'premium' ? premiumPool : randomPool;
      const lo = Math.floor(src.length * band.pctFrom / 100);
      const hi = Math.min(src.length, Math.ceil(src.length * band.pctTo / 100));
      const candidates = shuffle(src.slice(lo, hi).filter(p => !usedFids.has(p.timeline.fid)));
      let picked = 0;
      for (const { timeline } of candidates) {
        if (picked >= band.count) break;
        selectedTimelines.push(timeline);
        usedFids.add(timeline.fid);
        picked++;
      }
    }

    // Re-use pool Neynar data; fetch cast engagement only for the final 10
    const selectedFids = selectedTimelines.map(t => t.fid);
    const [neynarMap, engagementMap] = await Promise.all([
      Promise.resolve(poolNeynarMap),
      fetchCastEngagements(selectedFids),
    ]);

    const cards: BattleFIDCard[] = selectedTimelines.map(timeline =>
      buildCard(timeline, neynarMap.get(timeline.fid), engagementMap.get(timeline.fid)),
    );

    // Upsert card definitions (fid is PK — one row per person)
    for (const card of cards) {
      await sql`
        INSERT INTO cards (fid, pfp_url, pfp_urls, thumb_url, handle, display_name,
          max_supply, rarity, stats, battle_score, like_count, has_badge, card_type, stored_at)
        VALUES (
          ${card.fid}, ${card.pfpUrl}, ${card.pfpUrls}, ${card.thumbUrl},
          ${card.handle}, ${card.displayName}, ${card.maxSupply},
          ${card.rarity}, ${JSON.stringify(card.stats)}, ${card.battleScore},
          ${card.likeCount}, ${card.hasBadge}, ${card.cardType}, ${card.storedAt}
        )
        ON CONFLICT (fid) DO UPDATE SET
          pfp_url      = EXCLUDED.pfp_url,
          pfp_urls     = EXCLUDED.pfp_urls,
          thumb_url    = EXCLUDED.thumb_url,
          handle       = EXCLUDED.handle,
          display_name = EXCLUDED.display_name,
          stats        = EXCLUDED.stats,
          battle_score = EXCLUDED.battle_score,
          like_count   = EXCLUDED.like_count,
          has_badge    = EXCLUDED.has_badge,
          card_type    = EXCLUDED.card_type,
          stored_at    = EXCLUDED.stored_at
      `;
    }

    // Create pack record
    const [pack] = await sql`
      INSERT INTO packs (owner_fid, owner_device_id, tier)
      VALUES (${ownerFid}, ${ownerDeviceId}, ${tierId})
      RETURNING id
    `;

    // Assign serial numbers and create ownership records
    const owned: OwnedCard[] = [];
    for (const card of cards) {
      const [countRow] = await sql`SELECT COUNT(*)::int AS cnt FROM owned_cards WHERE fid = ${card.fid}`;
      const serialNumber = (countRow?.cnt ?? 0) + 1;
      const openedAt = new Date().toISOString();
      await sql`
        INSERT INTO owned_cards (pack_id, fid, owner_fid, owner_device_id, serial_number, opened_at)
        VALUES (${pack.id}, ${card.fid}, ${ownerFid}, ${ownerDeviceId}, ${serialNumber}, ${openedAt})
      `;
      owned.push({ card, serialNumber, openedAt });
    }

    // ── Edition 1/1 chance ───────────────────────────────────────────────────
    // Small flat chance per pack to pull a special edition 1/1 as a bonus card
    if (Math.random() < EDITION_1OF1_CHANCE) {
      try {
        // Find the active edition
        const editionRows = await sql`SELECT id FROM editions WHERE is_default = TRUE AND is_active = TRUE LIMIT 1`;
        const activeEditionId: string = editionRows[0]?.id ?? 'base';

        // Find a random card that doesn't yet have a claimed 1/1 for this edition
        const candidates = await sql`
          SELECT c.fid FROM cards c
          WHERE NOT EXISTS (
            SELECT 1 FROM edition_1of1s e
            WHERE e.fid = c.fid AND e.edition_id = ${activeEditionId}
          )
          ORDER BY RANDOM()
          LIMIT 1
        `;

        if (candidates.length > 0) {
          const candidateFid: number = candidates[0].fid;

          // Fetch that card's current data
          const [cardRow] = await sql`SELECT * FROM cards WHERE fid = ${candidateFid}`;
          if (cardRow) {
            const edition1of1Card: BattleFIDCard = {
              fid:          cardRow.fid,
              pfpUrl:       cardRow.pfp_url,
              pfpUrls:      cardRow.pfp_urls ?? [],
              pfpCount:     (cardRow.pfp_urls ?? []).length,
              thumbUrl:     cardRow.thumb_url,
              handle:       cardRow.handle,
              displayName:  cardRow.display_name,
              maxSupply:    cardRow.max_supply,
              rarity:       cardRow.rarity as BattleFIDCard['rarity'],
              stats:        cardRow.stats,
              battleScore:  cardRow.battle_score,
              cardType:     (cardRow.card_type ?? 'NETWORKER') as CardType,
              wins:         cardRow.wins ?? 0,
              losses:       cardRow.losses ?? 0,
              storedAt:     cardRow.stored_at,
              likeCount:    cardRow.like_count ?? 0,
              hasBadge:     cardRow.has_badge ?? false,
              isEdition1of1: true,
              edition1of1Id: activeEditionId,
            };

            // Mark as claimed
            await sql`
              INSERT INTO edition_1of1s (fid, edition_id, claimed, pack_id, owner_fid, owner_device_id)
              VALUES (${candidateFid}, ${activeEditionId}, TRUE, ${pack.id}, ${ownerFid}, ${ownerDeviceId})
              ON CONFLICT (fid, edition_id) DO NOTHING
            `;

            // Add to owned_cards as a 1/1 (serial 1)
            const openedAt = new Date().toISOString();
            await sql`
              INSERT INTO owned_cards (pack_id, fid, owner_fid, owner_device_id, serial_number, is_edition_1of1, edition_id, opened_at)
              VALUES (${pack.id}, ${candidateFid}, ${ownerFid}, ${ownerDeviceId}, 1, TRUE, ${activeEditionId}, ${openedAt})
            `;

            owned.push({ card: edition1of1Card, serialNumber: 1, openedAt, isEdition1of1: true, edition1of1Id: activeEditionId });
          }
        }
      } catch (e) {
        // Don't fail the whole pack if the 1/1 logic errors
        console.error('[packs] edition 1/1 error:', e);
      }
    }

    // Ensure player exists and award pack_open points
    await upsertPlayer(ownerFid, ownerDeviceId);
    await awardPoints(ownerFid, ownerDeviceId, 'pack_open');

    return NextResponse.json(owned);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[packs POST]', msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/packs?ownerFid=123 or ?ownerDeviceId=abc
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ownerFid = searchParams.get('ownerFid');
  const ownerDeviceId = searchParams.get('ownerDeviceId');

  if (!ownerFid && !ownerDeviceId) {
    return NextResponse.json([], { status: 400 });
  }

  let rows;
  if (ownerFid) {
    rows = await sql`
      SELECT oc.serial_number, oc.opened_at, oc.is_edition_1of1, oc.edition_id, c.*
      FROM owned_cards oc
      JOIN cards c ON c.fid = oc.fid
      WHERE oc.owner_fid = ${parseInt(ownerFid)}
      ORDER BY oc.opened_at DESC
    `;
  } else {
    // Collect all linked FIDs from player_wallets table (multiple wallets)
    let linkedFids: number[] = [];
    try {
      const walletRows = await sql`
        SELECT linked_fid FROM player_wallets
        WHERE owner_device_id = ${ownerDeviceId} AND linked_fid IS NOT NULL
      `;
      linkedFids = walletRows.map((r: { linked_fid: number }) => r.linked_fid);
    } catch {
      // player_wallets may not exist yet — fall back to players.linked_fid
      const playerRows = await sql`
        SELECT linked_fid FROM players WHERE owner_device_id = ${ownerDeviceId} LIMIT 1
      `;
      if (playerRows[0]?.linked_fid) linkedFids = [playerRows[0].linked_fid];
    }

    rows = linkedFids.length > 0
      ? await sql`
          SELECT oc.serial_number, oc.opened_at, oc.is_edition_1of1, oc.edition_id, c.*
          FROM owned_cards oc
          JOIN cards c ON c.fid = oc.fid
          WHERE oc.owner_device_id = ${ownerDeviceId} OR oc.owner_fid = ANY(${linkedFids}::int[])
          ORDER BY oc.opened_at DESC
        `
      : await sql`
          SELECT oc.serial_number, oc.opened_at, oc.is_edition_1of1, oc.edition_id, c.*
          FROM owned_cards oc
          JOIN cards c ON c.fid = oc.fid
          WHERE oc.owner_device_id = ${ownerDeviceId}
          ORDER BY oc.opened_at DESC
        `;
  }

  const owned: OwnedCard[] = rows.map((row) => ({
    serialNumber: row.serial_number,
    openedAt: row.opened_at,
    isEdition1of1: row.is_edition_1of1 ?? false,
    edition1of1Id: row.edition_id ?? undefined,
    card: {
      fid:          row.fid,
      pfpUrl:       row.pfp_url,
      pfpUrls:      row.pfp_urls ?? [],
      pfpCount:     (row.pfp_urls ?? []).length,
      thumbUrl:     row.thumb_url,
      handle:       row.handle,
      displayName:  row.display_name,
      maxSupply:    row.max_supply,
      rarity:       row.rarity,
      cardType:     (row.card_type ?? 'NETWORKER') as CardType,
      wins:         row.wins ?? 0,
      losses:       row.losses ?? 0,
      stats:        row.stats,
      battleScore:  row.battle_score,
      storedAt:     row.stored_at,
      likeCount:    row.like_count ?? 0,
      hasBadge:     row.has_badge ?? false,
      isEdition1of1: row.is_edition_1of1 ?? false,
      edition1of1Id: row.edition_id ?? undefined,
    },
  }));

  return NextResponse.json(owned);
}
