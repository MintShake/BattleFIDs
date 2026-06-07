import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchFaces } from '@/lib/faces';
import { fetchNeynarUsersDirect, fetchCastEngagements } from '@/lib/neynar';
import { buildAllVariants } from '@/lib/cardBuilder';
import { BattleFIDCard, OwnedCard, rarityFromFid, RarityTier } from '@/types/card';
import { FidTimeline } from '@/types/faces';
import {
  PACK_DEFS, PackTier, RARITY_ORDER,
  rollRarities, applyGuarantees,
} from '@/lib/packTiers';

const PACK_SIZE = 10;

type Slot = { timeline: FidTimeline; imageIndex: number };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// POST /api/packs
// Body: { ownerFid?, ownerDeviceId?, tier? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ownerFid: number | null = body.ownerFid ?? null;
  const ownerDeviceId: string | null = body.ownerDeviceId ?? null;
  const tierId: PackTier = body.tier ?? 'scroll';

  const packDef = PACK_DEFS.find(p => p.id === tierId) ?? PACK_DEFS[0];

  // Roll rarities for all 10 slots, then apply tier guarantees
  const rawRarities = rollRarities(packDef.weights, PACK_SIZE);
  const rarities = applyGuarantees(rawRarities, packDef.guaranteeRarity, packDef.guaranteeCount);

  // Probe total FID count to calculate safe offsets
  const probe = await fetchFaces({ limit: 1, offset: 0, imagesPerFid: 1 });
  const total = probe.totalFids;

  // Three pools covering the full FID spectrum in parallel:
  //   premium → offset 0             → FIDs ~1–100  (Alpha + Legendary)
  //   mid     → offset ~100–5000     → FIDs ~100–5000 (Elite + Rare)
  //   common  → offset ~10000–total  → FIDs ~10000+ (Common)
  const midOffset    = randInt(100, Math.min(5000, Math.max(101, Math.floor(total * 0.15))));
  const commonOffset = randInt(Math.min(10000, Math.floor(total * 0.5)), Math.max(10001, total - 100));

  const [premiumResult, midResult, commonResult] = await Promise.all([
    fetchFaces({ limit: 100, offset: 0,            imagesPerFid: 5, sort: 'fid', order: 'asc' }),
    fetchFaces({ limit: 100, offset: midOffset,    imagesPerFid: 5, sort: 'fid', order: 'asc' }),
    fetchFaces({ limit: 100, offset: commonOffset, imagesPerFid: 5, sort: 'fid', order: 'asc' }),
  ]);

  // Build per-rarity pools from all three fetch results
  const pools: Record<RarityTier, Slot[]> = {
    Alpha: [], Legendary: [], Elite: [], Rare: [], Common: [],
  };

  for (const result of [premiumResult, midResult, commonResult]) {
    for (const tl of result.data) {
      const r = rarityFromFid(tl.fid);
      for (let i = 0; i < tl.images.length; i++) {
        pools[r].push({ timeline: tl, imageIndex: i });
      }
    }
  }

  // Shuffle each pool
  for (const r of RARITY_ORDER) {
    pools[r].sort(() => Math.random() - 0.5);
  }

  // Fill each slot: try the rolled rarity, fall back toward Common if pool is empty
  const usedKeys = new Set<string>();
  const selected: Slot[] = [];

  for (const targetRarity of rarities) {
    const targetIdx = RARITY_ORDER.indexOf(targetRarity);
    // Try exact rarity first, then progressively more common
    const tryOrder: RarityTier[] = [
      ...RARITY_ORDER.slice(targetIdx),   // target → Common
      ...RARITY_ORDER.slice(0, targetIdx).reverse(), // rarer as last resort
    ];

    let picked = false;
    for (const r of tryOrder) {
      const slot = pools[r].find(
        s => !usedKeys.has(`${s.timeline.fid}-${s.imageIndex}`),
      );
      if (slot) {
        selected.push(slot);
        usedKeys.add(`${slot.timeline.fid}-${slot.imageIndex}`);
        picked = true;
        break;
      }
    }
    if (!picked) {
      // Absolute fallback — duplicate allowed rather than crash
      const any = [...pools.Common, ...pools.Rare, ...pools.Elite][0];
      if (any) selected.push(any);
    }
  }

  // Enrich with Neynar data
  const uniqueFids = [...new Set(selected.map(s => s.timeline.fid))];
  const [neynarMap, engagementMap] = await Promise.all([
    fetchNeynarUsersDirect(uniqueFids),
    fetchCastEngagements(uniqueFids),
  ]);

  const cards: BattleFIDCard[] = selected.map(({ timeline, imageIndex }) =>
    buildAllVariants(
      timeline,
      neynarMap.get(timeline.fid),
      engagementMap.get(timeline.fid),
    )[imageIndex],
  );

  // Upsert card definitions
  for (const card of cards) {
    await sql`
      INSERT INTO cards (image_id, fid, pfp_url, thumb_url, handle, display_name,
        max_supply, variant_index, total_variants, rarity, stats, battle_score,
        like_count, has_badge, stored_at)
      VALUES (
        ${card.imageId}, ${card.fid}, ${card.pfpUrl}, ${card.thumbUrl},
        ${card.handle}, ${card.displayName}, ${card.maxSupply},
        ${card.variantIndex}, ${card.totalVariants}, ${card.rarity},
        ${JSON.stringify(card.stats)}, ${card.battleScore},
        ${card.likeCount}, ${card.hasBadge}, ${card.storedAt}
      )
      ON CONFLICT (image_id) DO UPDATE SET
        handle       = EXCLUDED.handle,
        display_name = EXCLUDED.display_name,
        stats        = EXCLUDED.stats,
        battle_score = EXCLUDED.battle_score,
        like_count   = EXCLUDED.like_count,
        has_badge    = EXCLUDED.has_badge
    `;
  }

  // Create pack record (store the tier)
  const [pack] = await sql`
    INSERT INTO packs (owner_fid, owner_device_id, tier)
    VALUES (${ownerFid}, ${ownerDeviceId}, ${tierId})
    RETURNING id
  `;

  // Assign serial numbers and create ownership records
  const owned: OwnedCard[] = [];
  for (const card of cards) {
    const serialNumber = Math.floor(Math.random() * card.maxSupply) + 1;
    const openedAt = new Date().toISOString();
    await sql`
      INSERT INTO owned_cards (pack_id, image_id, owner_fid, owner_device_id, serial_number, opened_at)
      VALUES (${pack.id}, ${card.imageId}, ${ownerFid}, ${ownerDeviceId}, ${serialNumber}, ${openedAt})
    `;
    owned.push({ card, serialNumber, openedAt });
  }

  return NextResponse.json(owned);
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
        SELECT oc.serial_number, oc.opened_at, c.*
        FROM owned_cards oc
        JOIN cards c ON c.image_id = oc.image_id
        WHERE oc.owner_fid = ${parseInt(ownerFid)}
        ORDER BY oc.opened_at DESC
      `
    : await sql`
        SELECT oc.serial_number, oc.opened_at, c.*
        FROM owned_cards oc
        JOIN cards c ON c.image_id = oc.image_id
        WHERE oc.owner_device_id = ${ownerDeviceId}
        ORDER BY oc.opened_at DESC
      `;

  const owned: OwnedCard[] = rows.map((row) => ({
    serialNumber: row.serial_number,
    openedAt: row.opened_at,
    card: {
      fid:           row.fid,
      imageId:       row.image_id,
      pfpUrl:        row.pfp_url,
      thumbUrl:      row.thumb_url,
      handle:        row.handle,
      displayName:   row.display_name,
      maxSupply:     row.max_supply,
      variantIndex:  row.variant_index,
      totalVariants: row.total_variants,
      rarity:        row.rarity,
      stats:         row.stats,
      battleScore:   row.battle_score,
      storedAt:      row.stored_at,
      likeCount:     row.like_count ?? 0,
      hasBadge:      row.has_badge ?? false,
    },
  }));

  return NextResponse.json(owned);
}
