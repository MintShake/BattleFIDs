import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect, fetchWeeklyStats, fetchBonusMetric } from '@/lib/neynar';
import { prevWeekId } from '@/lib/weeklyScoring';
import { boundsForGameId, fastRoundsEnabled } from '@/lib/gameSchedule';
import { awardPoints } from '@/lib/points';

// GET /api/cron/score?weekId=2026-W23
// Runs Monday 00:00 UTC (Sunday midnight UK). Scores the week that just ended.
// Idempotent — skips if computed_at is already set.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const requestedWeekId = req.nextUrl.searchParams.get('weekId');
  let weekId = requestedWeekId ?? prevWeekId();

  if (!requestedWeekId && fastRoundsEnabled()) {
    const due = await sql`
      SELECT id FROM weeks
      WHERE id LIKE 'R-%'
        AND lock_at IS NOT NULL
        AND ends_at <= NOW()
        AND computed_at IS NULL
      ORDER BY ends_at ASC
      LIMIT 1
    `;
    if (!due[0]?.id) return NextResponse.json({ ok: true, noDueRounds: true });
    weekId = due[0].id as string;
  }

  const { start } = boundsForGameId(weekId);

  // Idempotency guard — don't double-score
  const weekRows = await sql`SELECT computed_at FROM weeks WHERE id = ${weekId}`;
  if (weekRows[0]?.computed_at) {
    return NextResponse.json({ ok: true, weekId, skipped: true, reason: 'already scored' });
  }

  // Load all locked teams for the week
  const teams = await sql`
    SELECT
      id, owner_fid, owner_device_id,
      casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
      followers_baseline, score_baseline, avg_team_score
    FROM weekly_teams
    WHERE week_id = ${weekId}
      AND casts_fid IS NOT NULL
  `;

  if (teams.length === 0) return NextResponse.json({ ok: true, weekId, teamsScored: 0 });

  // Collect all unique FIDs across all slots
  const allFids = new Set<number>();
  for (const t of teams) {
    for (const fid of [t.casts_fid, t.replies_fid, t.followers_fid, t.score_rise_fid, t.likes_fid]) {
      if (fid) allFids.add(Number(fid));
    }
  }

  const neynarMap = await fetchNeynarUsersDirect([...allFids]);

  type WeekStats = { casts: number; replies: number; likes: number };
  const statsMap = new Map<number, WeekStats>();
  for (const fid of allFids) {
    const s = await fetchWeeklyStats(fid, start);
    statsMap.set(fid, {
      casts:   s.castsPublished,
      replies: s.repliesSent,
      likes:   s.likesReceived,
    });
  }

  interface TeamMetrics {
    teamId:       string;
    ownerFid:     number | null;
    deviceId:     string | null;
    casts:        number;
    replies:      number;
    followers:    number;
    score_rise:   number;
    likes:        number;
    avgTeamScore: number;
    slotFids:     number[];
  }

  const metrics: TeamMetrics[] = teams.map(t => {
    const slotFids = [
      Number(t.casts_fid), Number(t.replies_fid), Number(t.followers_fid),
      Number(t.score_rise_fid), Number(t.likes_fid),
    ];

    const followersCurrent = neynarMap.get(Number(t.followers_fid))?.follower_count ?? 0;
    const followersGained  = Math.max(0, followersCurrent - (Number(t.followers_baseline) ?? 0));

    const scoreCurrent = (neynarMap.get(Number(t.score_rise_fid))?.score ?? 0) * 1000;
    const scoreRise    = Math.max(0, scoreCurrent - (Number(t.score_baseline) ?? 0) * 1000);

    return {
      teamId:       t.id,
      ownerFid:     t.owner_fid ? Number(t.owner_fid) : null,
      deviceId:     t.owner_device_id ?? null,
      casts:        statsMap.get(Number(t.casts_fid))?.casts   ?? 0,
      replies:      statsMap.get(Number(t.replies_fid))?.replies ?? 0,
      followers:    followersGained,
      score_rise:   scoreRise,
      likes:        statsMap.get(Number(t.likes_fid))?.likes    ?? 0,
      avgTeamScore: Number(t.avg_team_score ?? 0),
      slotFids,
    };
  });

  const slots = ['casts', 'replies', 'followers', 'score_rise', 'likes'] as const;

  const slotPoints = new Map<string, number>();

  if (metrics.length >= 2) {
    for (const slot of slots) {
      const ranked = [...metrics].sort((a, b) => b[slot] - a[slot]);
      for (const team of ranked) {
        const myValue = team[slot];
        const beaten = ranked.filter(r => r[slot] < myValue).length;
        slotPoints.set(team.teamId, (slotPoints.get(team.teamId) ?? 0) + beaten);
      }
    }
  }

  const rankedTeams = [...metrics].sort((a, b) => {
    const pa = slotPoints.get(a.teamId) ?? 0;
    const pb = slotPoints.get(b.teamId) ?? 0;
    if (pb !== pa) return pb - pa;
    return b.avgTeamScore - a.avgTeamScore;
  });

  const half = Math.ceil(rankedTeams.length / 2);

  for (let i = 0; i < rankedTeams.length; i++) {
    const { teamId, ownerFid, deviceId, slotFids } = rankedTeams[i];
    const points = slotPoints.get(teamId) ?? 0;
    const rank   = i + 1;
    const won    = rank <= half;

    await sql`
      UPDATE weekly_teams
      SET slot_points = ${points}, rank = ${rank}, total_score = ${points}
      WHERE id = ${teamId}
    `;

    await awardPoints(ownerFid, deviceId, 'week_played', 1, { weekId });

    if (points > 0) {
      await awardPoints(ownerFid, deviceId, 'slot_beat', points, { weekId, league: 'main' });
    }

    if (won) {
      await awardPoints(ownerFid, deviceId, 'overall_win', 1, { weekId, rank });
    }

    if (rank <= 25) {
      await awardPoints(ownerFid, deviceId, 'top_25', 1, { weekId, rank });
    }

    const hasRareCard = slotFids.some(f => f <= 100);
    if (hasRareCard) {
      await awardPoints(ownerFid, deviceId, 'rare_card_bonus', 1, { weekId });
    }

    if (ownerFid) {
      if (won) {
        await sql`UPDATE players SET total_wins = total_wins + 1 WHERE owner_fid = ${ownerFid}`;
      } else {
        await sql`UPDATE players SET total_losses = total_losses + 1 WHERE owner_fid = ${ownerFid}`;
      }
    }
  }

  await sql`UPDATE weeks SET computed_at = NOW() WHERE id = ${weekId}`;

  // ── Edition bonus slots ───────────────────────────────────────────────────────
  const editionGroups = await sql`
    SELECT edition_id, slot_key, COUNT(*) AS cnt
    FROM weekly_edition_picks
    WHERE week_id = ${weekId}
    GROUP BY edition_id, slot_key
    HAVING COUNT(*) >= 2
  `;

  let editionPicksScored = 0;

  for (const eg of editionGroups) {
    const editionId = eg.edition_id as string;
    const slotKey   = eg.slot_key as string;

    const slotDef = await sql`
      SELECT metric_type FROM edition_bonus_slots
      WHERE edition_id = ${editionId} AND slot_key = ${slotKey}
    `;
    if (!slotDef[0]) continue;
    const metricType = slotDef[0].metric_type as string;

    const picks = await sql`
      SELECT id, owner_fid, owner_device_id, card_fid
      FROM weekly_edition_picks
      WHERE week_id = ${weekId} AND edition_id = ${editionId} AND slot_key = ${slotKey}
    `;

    const values: { id: string; ownerFid: number | null; deviceId: string | null; value: number }[] = [];
    for (const p of picks) {
      const v = await fetchBonusMetric(Number(p.card_fid), metricType, start);
      values.push({ id: p.id as string, ownerFid: p.owner_fid ? Number(p.owner_fid) : null, deviceId: p.owner_device_id ?? null, value: v });
    }

    values.sort((a, b) => b.value - a.value);
    for (let i = 0; i < values.length; i++) {
      const { id, ownerFid, deviceId, value } = values[i];
      const rank    = i + 1;
      const beating = values.filter(v => v.value < value).length;

      await sql`
        UPDATE weekly_edition_picks
        SET score_value = ${value}, slot_points = ${beating}, rank = ${rank}
        WHERE id = ${id}
      `;

      if (beating > 0) {
        await awardPoints(ownerFid, deviceId, 'slot_beat', beating, { weekId, edition: editionId, slot: slotKey });
      }
      editionPicksScored++;
    }
  }

  return NextResponse.json({ ok: true, weekId, teamsScored: teams.length, editionPicksScored });
}
