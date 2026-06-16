import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId } from '@/lib/weeklyScoring';
import { fetchNeynarUsersDirect } from '@/lib/neynar';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  const cwId = currentWeekId();

  const [totalCardsRes, totalPlayersRes, weekTeamsRes, topCardRes, lastWinnersRes, topPlayersRes] =
    await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM owned_cards`,
      sql`SELECT COUNT(*)::int AS n FROM players`,
      sql`SELECT COUNT(*)::int AS n FROM weekly_teams WHERE week_id = ${cwId} AND casts_fid IS NOT NULL`,
      sql`
        SELECT fid, handle, display_name, thumb_url, battle_score, rarity
        FROM cards ORDER BY battle_score DESC LIMIT 1
      `,
      sql`
        SELECT wt.owner_fid, wt.slot_points, wt.rank, wt.week_id
        FROM weekly_teams wt
        JOIN weeks w ON w.id = wt.week_id
        WHERE wt.rank = 1 AND w.computed_at IS NOT NULL
        ORDER BY w.computed_at DESC, wt.slot_points DESC
        LIMIT 2
      `,
      sql`
        SELECT owner_fid, protocol_points FROM players
        WHERE owner_fid IS NOT NULL AND protocol_points > 0
        ORDER BY protocol_points DESC LIMIT 3
      `,
    ]);

  // Batch Neynar lookups for winners + top players
  const fidSet = new Set<number>();
  for (const r of lastWinnersRes) if (r.owner_fid) fidSet.add(Number(r.owner_fid));
  for (const r of topPlayersRes)  if (r.owner_fid) fidSet.add(Number(r.owner_fid));

  const neynarMap = fidSet.size > 0
    ? await fetchNeynarUsersDirect([...fidSet]).catch(() => new Map())
    : new Map();

  const lastWinners = lastWinnersRes.map(r => ({
    ownerFid:   r.owner_fid ? Number(r.owner_fid) : null,
    handle:     r.owner_fid ? (neynarMap.get(Number(r.owner_fid))?.username ?? `fid${r.owner_fid}`) : null,
    slotPoints: Number(r.slot_points ?? 0),
    weekId:     r.week_id as string,
  }));

  const topPlayers = topPlayersRes.map(r => ({
    ownerFid:       Number(r.owner_fid),
    protocolPoints: Number(r.protocol_points),
    handle:         neynarMap.get(Number(r.owner_fid))?.username ?? `fid${r.owner_fid}`,
  }));

  return NextResponse.json({
    totalCards:    Number(totalCardsRes[0]?.n  ?? 0),
    totalPlayers:  Number(totalPlayersRes[0]?.n ?? 0),
    weekTeams:     Number(weekTeamsRes[0]?.n    ?? 0),
    topCard: topCardRes[0] ? {
      fid:         Number(topCardRes[0].fid),
      handle:      topCardRes[0].handle      as string,
      displayName: topCardRes[0].display_name as string,
      thumbUrl:    topCardRes[0].thumb_url    as string,
      battleScore: Number(topCardRes[0].battle_score),
      rarity:      topCardRes[0].rarity       as string,
    } : null,
    lastWinners,
    topPlayers,
    currentWeekId: cwId,
  });
}
