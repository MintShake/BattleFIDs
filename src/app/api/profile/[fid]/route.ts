import type { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect } from '@/lib/neynar';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fid: string }> },
) {
  const { fid: fidParam } = await params;
  const fid = parseInt(fidParam);
  if (isNaN(fid)) return Response.json({ error: 'invalid fid' }, { status: 400 });

  const [rows, neynarMap] = await Promise.all([
    sql`
      SELECT image_id, pfp_url, thumb_url, variant_index, stored_at,
             like_count, has_badge, battle_score, rarity, display_name, handle
      FROM cards
      WHERE fid = ${fid}
      ORDER BY variant_index ASC
    `,
    fetchNeynarUsersDirect([fid]),
  ]);

  return Response.json({
    cards: rows,
    neynarUser: neynarMap.get(fid) ?? null,
  });
}
