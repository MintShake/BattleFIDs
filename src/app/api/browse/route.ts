import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect } from '@/lib/neynar';
import { CardType, OwnedCard } from '@/types/card';

interface GlobalCard {
  ownedCard: OwnedCard;
  ownerHandle?: string;
  ownerFid?: number;
}

// GET /api/browse — all cards ever opened, newest first, with owner handle
export async function GET() {
  const rows = await sql`
    SELECT
      oc.serial_number,
      oc.opened_at,
      oc.owner_fid,
      oc.owner_device_id,
      oc.is_edition_1of1,
      oc.edition_id,
      c.*
    FROM owned_cards oc
    JOIN cards c ON c.fid = oc.fid
    ORDER BY oc.opened_at DESC
    LIMIT 200
  `;

  const uniqueFids = [...new Set(
    rows.map(r => r.owner_fid).filter((f): f is number => !!f),
  )];

  const neynarMap = uniqueFids.length > 0
    ? await fetchNeynarUsersDirect(uniqueFids).catch(() => new Map())
    : new Map();

  const result: GlobalCard[] = rows.map((row) => {
    const fid: number | null = row.owner_fid ?? null;
    const neynar = fid ? neynarMap.get(fid) : undefined;
    const ownerHandle = neynar?.username ?? (fid ? `fid${fid}` : 'anon');

    return {
      ownedCard: {
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
          wins:         row.wins   ?? 0,
          losses:       row.losses ?? 0,
          stats:        row.stats,
          battleScore:  row.battle_score,
          storedAt:     row.stored_at,
          likeCount:    row.like_count ?? 0,
          hasBadge:     row.has_badge ?? false,
          isEdition1of1: row.is_edition_1of1 ?? false,
          edition1of1Id: row.edition_id ?? undefined,
        },
      },
      ownerHandle,
      ownerFid: fid ?? undefined,
    };
  });

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
