import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { OwnedCard } from '@/types/card';

interface GlobalCard {
  ownedCard: OwnedCard;
  ownerHandle?: string;
}

// GET /api/browse — all cards ever opened, newest first, with owner handle
export async function GET() {
  const rows = await sql`
    SELECT
      oc.serial_number,
      oc.opened_at,
      oc.owner_fid,
      c.*
    FROM owned_cards oc
    JOIN cards c ON c.image_id = oc.image_id
    ORDER BY oc.opened_at DESC
    LIMIT 200
  `;

  const result: GlobalCard[] = rows.map((row) => ({
    ownedCard: {
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
        likeCount: row.like_count ?? 0,
        hasBadge: row.has_badge ?? false,
      },
    },
    ownerHandle: row.owner_fid ? `fid${row.owner_fid}` : undefined,
  }));

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
