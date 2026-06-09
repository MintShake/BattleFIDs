import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchFaces } from '@/lib/faces';
import { fetchNeynarUsersDirect, fetchCastEngagements } from '@/lib/neynar';
import { buildCard } from '@/lib/cardBuilder';
import { BattleFIDCard, CardType, OwnedCard, rarityFromFid, RarityTier } from '@/types/card';
import { FidTimeline } from '@/types/faces';
import {
  PACK_DEFS, PackTier, RARITY_ORDER,
  rollRarities,
} from '@/lib/packTiers';

const PACK_SIZE = 10;
// Flat probability per pack of pulling an edition 1/1 as a bonus card
const EDITION_1OF1_CHANCE = 0.015; // 1.5% per pack

type Slot = { timeline: FidTimeline };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

    // Roll rarities for all 10 slots
    const rarities = rollRarities(packDef.weights, PACK_SIZE);

    const probe = await fetchFaces({ limit: 1, offset: 0, imagesPerFid: 1 });
    const total = probe.totalFids;

    const midOffset    = randInt(100, Math.min(5000, Math.max(101, Math.floor(total * 0.15))));
    const commonOffset = randInt(Math.min(10000, Math.floor(total * 0.5)), Math.max(10001, total - 100));

    const [premiumResult, midResult, commonResult] = await Promise.all([
      fetchFaces({ limit: 100, offset: 0,            imagesPerFid: 50, sort: 'fid', order: 'asc' }),
      fetchFaces({ limit: 100, offset: midOffset,    imagesPerFid: 50, sort: 'fid', order: 'asc' }),
      fetchFaces({ limit: 100, offset: commonOffset, imagesPerFid: 50, sort: 'fid', order: 'asc' }),
    ]);

    // Build per-rarity pools (one slot per FID — no duplicate FIDs)
    const pools: Record<RarityTier, Slot[]> = {
      Alpha: [], Legendary: [], Elite: [], Rare: [], Common: [],
    };

    for (const result of [premiumResult, midResult, commonResult]) {
      for (const tl of result.data) {
        const r = rarityFromFid(tl.fid);
        pools[r].push({ timeline: tl });
      }
    }

    // Sort by engagement, apply tier percentile filter, then shuffle
    for (const r of RARITY_ORDER) {
      const totalLikes = (slot: Slot) =>
        slot.timeline.images.reduce((s, img) => s + img.likeCount, 0);
      pools[r].sort((a, b) => totalLikes(b) - totalLikes(a));
      const keep = Math.max(1, Math.ceil(pools[r].length * (packDef.scorePercentile / 100)));
      pools[r] = pools[r].slice(0, keep);
      pools[r].sort(() => Math.random() - 0.5);
    }

    // Fill each slot, one FID per slot (tracked by fid, not fid+imageIndex)
    const usedFids = new Set<number>();
    const selected: Slot[] = [];

    for (const targetRarity of rarities) {
      const targetIdx = RARITY_ORDER.indexOf(targetRarity);
      const tryOrder: RarityTier[] = [
        ...RARITY_ORDER.slice(targetIdx),
        ...RARITY_ORDER.slice(0, targetIdx).reverse(),
      ];

      let picked = false;
      for (const r of tryOrder) {
        const slot = pools[r].find(s => !usedFids.has(s.timeline.fid));
        if (slot) {
          selected.push(slot);
          usedFids.add(slot.timeline.fid);
          picked = true;
          break;
        }
      }
      if (!picked) {
        const any = [...pools.Common, ...pools.Rare, ...pools.Elite].find(s => !usedFids.has(s.timeline.fid));
        if (any) { selected.push(any); usedFids.add(any.timeline.fid); }
      }
    }

    // Enrich with Neynar data
    const uniqueFids = selected.map(s => s.timeline.fid);
    const [neynarMap, engagementMap] = await Promise.all([
      fetchNeynarUsersDirect(uniqueFids),
      fetchCastEngagements(uniqueFids),
    ]);

    const cards: BattleFIDCard[] = selected.map(({ timeline }) =>
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

  const rows = ownerFid
    ? await sql`
        SELECT oc.serial_number, oc.opened_at, oc.is_edition_1of1, oc.edition_id, c.*
        FROM owned_cards oc
        JOIN cards c ON c.fid = oc.fid
        WHERE oc.owner_fid = ${parseInt(ownerFid)}
        ORDER BY oc.opened_at DESC
      `
    : await sql`
        SELECT oc.serial_number, oc.opened_at, oc.is_edition_1of1, oc.edition_id, c.*
        FROM owned_cards oc
        JOIN cards c ON c.fid = oc.fid
        WHERE oc.owner_device_id = ${ownerDeviceId}
        ORDER BY oc.opened_at DESC
      `;

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
