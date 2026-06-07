import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchWeeklyStats } from '@/lib/neynar';
import { currentWeekId, weekBounds, scoreForType, teamTotalScore, CAPTAIN_MULT } from '@/lib/weeklyScoring';
import { CardType, RarityTier } from '@/types/card';

// GET /api/week/score?weekId=2026-W23
// Returns current scores for all cards active in any team this week
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weekId = searchParams.get('weekId') ?? currentWeekId();

  const scores = await sql`
    SELECT image_id, card_type, normalized_score, computed_at
    FROM weekly_card_scores
    WHERE week_id = ${weekId}
    ORDER BY normalized_score DESC
  `;

  return NextResponse.json({ weekId, scores });
}

// POST /api/week/score/compute — admin trigger to run scoring for the week
// Protected by a simple secret header: X-Admin-Secret
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const weekId = body.weekId ?? currentWeekId();
  const { start } = weekBounds(weekId);

  // Collect all distinct FIDs active in any team this week
  const teamCards = await sql`
    SELECT DISTINCT
      unnest(ARRAY[captain_image_id, broadcaster_image_id, publisher_image_id, agitator_image_id, networker_image_id]) AS image_id
    FROM weekly_teams
    WHERE week_id = ${weekId}
  `;

  const imageIds = [...new Set(teamCards.map(r => r.image_id).filter(Boolean))];

  // Fetch card metadata (fid + type) for all active cards
  const cardMeta = imageIds.length > 0
    ? await sql`SELECT image_id, fid, card_type, rarity FROM cards WHERE image_id = ANY(${imageIds}::text[])`
    : [];

  // Score each card
  const results: { imageId: string; type: CardType; rawScore: number; normalizedScore: number }[] = [];

  for (const card of cardMeta) {
    const stats = await fetchWeeklyStats(card.fid, start);
    const type  = card.card_type as CardType;
    const raw   = type === 'CAPTAIN' ? 0 :
      type === 'BROADCASTER' ? stats.recastsReceived :
      type === 'PUBLISHER'   ? stats.likesReceived :
      type === 'AGITATOR'    ? stats.repliesReceived :
      stats.repliesSent;

    const normalized = scoreForType(type, stats);

    await sql`
      INSERT INTO weekly_card_scores (week_id, fid, image_id, card_type, raw_score, normalized_score, computed_at)
      VALUES (${weekId}, ${card.fid}, ${card.image_id}, ${type}, ${raw}, ${normalized}, NOW())
      ON CONFLICT (week_id, image_id) DO UPDATE SET
        raw_score        = EXCLUDED.raw_score,
        normalized_score = EXCLUDED.normalized_score,
        computed_at      = NOW()
    `;

    results.push({ imageId: card.image_id, type, rawScore: raw, normalizedScore: normalized });
  }

  // Update total_score + rank for each team
  const teams = await sql`
    SELECT id, owner_fid, owner_device_id,
      captain_image_id, broadcaster_image_id, publisher_image_id, agitator_image_id, networker_image_id
    FROM weekly_teams WHERE week_id = ${weekId}
  `;

  const scoreMap = new Map(results.map(r => [r.imageId, r.normalizedScore]));
  const cardRarity = new Map(cardMeta.map(c => [c.image_id, c.rarity as RarityTier]));

  const teamScores: { id: string; score: number }[] = [];

  for (const team of teams) {
    const captainRarity = cardRarity.get(team.captain_image_id) ?? 'Common';
    const slots = [
      { type: 'CAPTAIN'     as CardType, score: 0 },
      { type: 'BROADCASTER' as CardType, score: scoreMap.get(team.broadcaster_image_id) ?? 0 },
      { type: 'PUBLISHER'   as CardType, score: scoreMap.get(team.publisher_image_id)   ?? 0 },
      { type: 'AGITATOR'    as CardType, score: scoreMap.get(team.agitator_image_id)    ?? 0 },
      { type: 'NETWORKER'   as CardType, score: scoreMap.get(team.networker_image_id)   ?? 0 },
    ];
    const total = teamTotalScore(slots, captainRarity);
    teamScores.push({ id: team.id, score: total });
  }

  // Sort and assign ranks
  teamScores.sort((a, b) => b.score - a.score);
  for (let i = 0; i < teamScores.length; i++) {
    const { id, score } = teamScores[i];
    await sql`UPDATE weekly_teams SET total_score = ${score}, rank = ${i + 1} WHERE id = ${id}`;
  }

  // Update W/L on cards — top half of teams win, bottom half lose
  const midpoint = Math.ceil(teamScores.length / 2);
  const winningTeams = new Set(teamScores.slice(0, midpoint).map(t => t.id));

  for (const team of teams) {
    const slots = [team.captain_image_id, team.broadcaster_image_id, team.publisher_image_id, team.agitator_image_id, team.networker_image_id].filter(Boolean);
    const won = winningTeams.has(team.id);
    for (const imageId of slots) {
      if (won) {
        await sql`UPDATE cards SET wins   = wins   + 1 WHERE image_id = ${imageId}`;
      } else {
        await sql`UPDATE cards SET losses = losses + 1 WHERE image_id = ${imageId}`;
      }
    }
  }

  // ── Xplora credit prizes ──────────────────────────────────────────────────
  // USDC wagered goes to protocol revenue — winners receive Xplora credits.
  // Credit pool = sum of all wagers × XP_PER_USDC.
  // Free entries compete for leaderboard position; no credit prize.
  // Top 3 wagered teams split the credit pool proportionally by score.
  // Top 3 free teams each receive a flat consolation credit bonus.
  const XP_PER_USDC     = 100; // 1 USDC wagered → 100 XP in the prize pool
  const FREE_TOP3_BONUS = 25;  // XP for placing top 3 without a wager

  const allTeamsFull = await sql`
    SELECT id, owner_fid, wager_usdc, total_score, rank
    FROM weekly_teams WHERE week_id = ${weekId}
    ORDER BY rank ASC
  `;

  const wageredTeams = allTeamsFull.filter(t => Number(t.wager_usdc) > 0);
  const freeTeams    = allTeamsFull.filter(t => Number(t.wager_usdc) === 0);

  const creditPool   = wageredTeams.reduce((s, t) => s + Number(t.wager_usdc), 0) * XP_PER_USDC;
  const top3Wagered  = wageredTeams.slice(0, 3);
  const top3WScore   = top3Wagered.reduce((s, t) => s + Number(t.total_score), 0);

  const payouts: { teamId: string; ownerFid: number | null; credits: number }[] = [];

  for (const team of top3Wagered) {
    const credits = top3WScore > 0
      ? Math.round((Number(team.total_score) / top3WScore) * creditPool)
      : 0;
    await sql`UPDATE weekly_teams SET xplora_credits_won = ${credits} WHERE id = ${team.id}`;
    if (team.owner_fid && credits > 0) {
      await sql`
        INSERT INTO xplora_balances (owner_fid, credits, updated_at)
        VALUES (${team.owner_fid}, ${credits}, NOW())
        ON CONFLICT (owner_fid) DO UPDATE SET
          credits    = xplora_balances.credits + EXCLUDED.credits,
          updated_at = NOW()
      `;
    }
    payouts.push({ teamId: team.id, ownerFid: team.owner_fid, credits });
  }

  // Consolation for top-3 free players
  for (const team of freeTeams.slice(0, 3)) {
    await sql`UPDATE weekly_teams SET xplora_credits_won = ${FREE_TOP3_BONUS} WHERE id = ${team.id}`;
    if (team.owner_fid) {
      await sql`
        INSERT INTO xplora_balances (owner_fid, credits, updated_at)
        VALUES (${team.owner_fid}, ${FREE_TOP3_BONUS}, NOW())
        ON CONFLICT (owner_fid) DO UPDATE SET
          credits    = xplora_balances.credits + ${FREE_TOP3_BONUS},
          updated_at = NOW()
      `;
    }
  }

  const prizePool  = wageredTeams.reduce((s, t) => s + Number(t.wager_usdc), 0);
  const payoutsOut = payouts;

  // Mark week as computed
  await sql`UPDATE weeks SET computed_at = NOW() WHERE id = ${weekId}`;

  return NextResponse.json({ ok: true, weekId, cardsScored: results.length, teamsRanked: teams.length, creditPool, prizePool, payouts: payoutsOut });
}
