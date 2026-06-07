import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchFaces } from '@/lib/faces';
import { fetchNeynarUsers } from '@/lib/neynar';
import { buildAllVariants } from '@/lib/cardBuilder';
import { BattleFIDCard, OwnedCard } from '@/types/card';

const PACK_SIZE = 10;

// POST /api/packs
// Body: { ownerFid?: number, ownerDeviceId?: string }
// Returns: OwnedCard[] (10 cards, persisted to Neon)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ownerFid: number | null = body.ownerFid ?? null;
  const ownerDeviceId: string | null = body.ownerDeviceId ?? null;

  // 1. Pick 10 random cards from Faces API
  const probe = await fetchFaces({ limit: 1, offset: 0, imagesPerFid: 1 });
  const total = probe.totalFids;
  const maxOffset = Math.max(0, total - PACK_SIZE * 4);
  const offset = Math.floor(Math.random() * maxOffset);

  const result = await fetchFaces({
    limit: PACK_SIZE * 4,
    offset,
    imagesPerFid: 5,
    sort: 'fid',
    order: 'asc',
  });

  const pool: Array<{ timeline: typeof result.data[0]; imageIndex: number }> = [];
  for (const tl of result.data) {
    for (let i = 0; i < tl.images.length; i++) {
      pool.push({ timeline: tl, imageIndex: i });
    }
  }

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, PACK_SIZE);
  const uniqueFids = [...new Set(shuffled.map((x) => x.timeline.fid))];
  const neynarMap = await fetchNeynarUsers(uniqueFids);

  const cards: BattleFIDCard[] = shuffled.map(({ timeline, imageIndex }) =>
    buildAllVariants(timeline, neynarMap.get(timeline.fid))[imageIndex],
  );

  // 2. Upsert card definitions (ignore conflicts — card type may already exist)
  for (const card of cards) {
    await sql`
      INSERT INTO cards (image_id, fid, pfp_url, thumb_url, handle, display_name,
        max_supply, variant_index, total_variants, rarity, stats, battle_score, stored_at)
      VALUES (
        ${card.imageId}, ${card.fid}, ${card.pfpUrl}, ${card.thumbUrl},
        ${card.handle}, ${card.displayName}, ${card.maxSupply},
        ${card.variantIndex}, ${card.totalVariants}, ${card.rarity},
        ${JSON.stringify(card.stats)}, ${card.battleScore}, ${card.storedAt}
      )
      ON CONFLICT (image_id) DO NOTHING
    `;
  }

  // 3. Create pack record
  const [pack] = await sql`
    INSERT INTO packs (owner_fid, owner_device_id)
    VALUES (${ownerFid}, ${ownerDeviceId})
    RETURNING id
  `;

  // 4. Assign serial numbers and create ownership records
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
// Returns all cards owned by the given identity
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
      fid: row.fid,
      imageId: row.image_id,
      pfpUrl: row.pfp_url,
      thumbUrl: row.thumb_url,
      handle: row.handle,
      displayName: row.display_name,
      maxSupply: row.max_supply,
      variantIndex: row.variant_index,
      totalVariants: row.total_variants,
      rarity: row.rarity,
      stats: row.stats,
      battleScore: row.battle_score,
      storedAt: row.stored_at,
    },
  }));

  return NextResponse.json(owned);
}
