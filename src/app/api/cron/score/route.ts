import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { fetchNeynarUsersDirect, fetchWeeklyStats } from '@/lib/neynar';
import { currentWeekId, weekBounds } from '@/lib/weeklyScoring';
import { awardPoints } from '@/lib/points';

// GET /api/cron/score?weekId=2026-W23
// Runs at end of week (Sunday 23:00 UTC).
// For each team: fetches Neynar metrics per slot, ranks teams within their group
// per slot, awards 1 protocol point per person beaten in each slot.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const weekId = req.nextUrl.searchParams.get('weekId') ?? currentWeekId();
  const { start } = weekBounds(weekId);

  // Load all locked teams for the week
  const teams = await sql`
    SELECT
      id, owner_fid, owner_device_id, chosen_tier, assigned_group,
      casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid,
      followers_baseline, score_baseline
    FROM weekly_teams
    WHERE week_id = ${weekId}
      AND casts_fid IS NOT NULL
  `;

  if (teams.length === 0) return NextResponse.json({ ok: true, weekId, teamsScored: 0 });

  // Resolve each team's effective group
  // Pro-locked players always land in 'pro'
  // Confident players use assigned_group (already flipped by tier cron)
  // Beginner players are in 'beginner'
  function resolveGroup(team: typeof teams[0]): 'beginner' | 'pro' {
    if (team.chosen_tier === 'pro') return 'pro';
    if (team.chosen_tier === 'confident') return (team.assigned_group ?? 'beginner') as 'beginner' | 'pro';
    return 'beginner';
  }

  // Collect all unique FIDs across all slots
  const allFids = new Set<number>();
  for (const t of teams) {
    for (const fid of [t.casts_fid, t.replies_fid, t.followers_fid, t.score_rise_fid, t.likes_fid]) {
      if (fid) allFids.add(Number(fid));
    }
  }

  // Fetch current Neynar data for all FIDs (follower_count, score)
  const neynarMap = await fetchNeynarUsersDirect([...allFids]);

  // Fetch weekly cast/reply/likes stats for all FIDs
  type WeekStats = { casts: number; replies: number; likes: number };
  const statsMap = new Map<number, WeekStats>();

  for (const fid of allFids) {
    const s = await fetchWeeklyStats(fid, start);
    // fetchWeeklyStats returns recastsReceived, likesReceived, repliesReceived, repliesSent
    // We need: casts = (likesReceived proxy via casts count), replies sent, likes received
    // Re-fetch cast count specifically
    statsMap.set(fid, {
      casts:   await fetchCastCount(fid, start),
      replies: s.repliesSent,
      likes:   s.likesReceived,
    });
  }

  // Build per-team metric values for each slot
  interface TeamMetrics {
    teamId:      string;
    ownerFid:    number | null;
    deviceId:    string | null;
    group:       'beginner' | 'pro';
    casts:       number;
    replies:     number;
    followers:   number;  // delta from baseline
    score_rise:  number;  // delta from baseline (×1000 for precision)
    likes:       number;
  }

  const metrics: TeamMetrics[] = teams.map(t => {
    const group = resolveGroup(t);
    const castsFid      = Number(t.casts_fid);
    const repliesFid    = Number(t.replies_fid);
    const followersFid  = Number(t.followers_fid);
    const scoreRiseFid  = Number(t.score_rise_fid);
    const likesFid      = Number(t.likes_fid);

    const followersCurrent = neynarMap.get(followersFid)?.follower_count ?? 0;
    const followersGained  = Math.max(0, followersCurrent - (Number(t.followers_baseline) ?? 0));

    const scoreCurrent = (neynarMap.get(scoreRiseFid)?.score ?? 0) * 1000;
    const scoreRise    = Math.max(0, scoreCurrent - (Number(t.score_baseline) ?? 0) * 1000);

    return {
      teamId:     t.id,
      ownerFid:   t.owner_fid ? Number(t.owner_fid) : null,
      deviceId:   t.owner_device_id ?? null,
      group,
      casts:      statsMap.get(castsFid)?.casts   ?? 0,
      replies:    statsMap.get(repliesFid)?.replies ?? 0,
      followers:  followersGained,
      score_rise: scoreRise,
      likes:      statsMap.get(likesFid)?.likes    ?? 0,
    };
  });

  // Score within each group per slot
  const slots = ['casts', 'replies', 'followers', 'score_rise', 'likes'] as const;
  const groups: Array<'beginner' | 'pro'> = ['beginner', 'pro'];

  const slotPoints = new Map<string, number>(); // teamId → total slot points

  for (const group of groups) {
    const groupTeams = metrics.filter(m => m.group === group);
    if (groupTeams.length < 2) continue;

    for (const slot of slots) {
      // Sort descending by slot metric
      const ranked = [...groupTeams].sort((a, b) => b[slot] - a[slot]);

      // For each team, count how many teams they beat in this slot
      for (let i = 0; i < ranked.length; i++) {
        const team = ranked[i];
        const myValue = team[slot];
        // Beat everyone below with a strictly lower value (ties don't count)
        const beaten = ranked.filter(r => r[slot] < myValue).length;
        const prev = slotPoints.get(team.teamId) ?? 0;
        slotPoints.set(team.teamId, prev + beaten);
      }
    }
  }

  // Persist slot_points, rank within group, award protocol points + week_played bonus
  for (const group of groups) {
    const groupTeams = metrics.filter(m => m.group === group);
    groupTeams.sort((a, b) => (slotPoints.get(b.teamId) ?? 0) - (slotPoints.get(a.teamId) ?? 0));

    for (let i = 0; i < groupTeams.length; i++) {
      const { teamId, ownerFid, deviceId } = groupTeams[i];
      const points = slotPoints.get(teamId) ?? 0;
      const rank   = i + 1;
      const won    = rank <= Math.ceil(groupTeams.length / 2);

      await sql`
        UPDATE weekly_teams
        SET slot_points = ${points}, rank = ${rank}, total_score = ${points}
        WHERE id = ${teamId}
      `;

      // Award protocol points: slot_beat (1 per person beaten) + week_played flat
      if (points > 0) {
        await awardPoints(ownerFid, deviceId, 'slot_beat', points, { weekId, group });
      }
      await awardPoints(ownerFid, deviceId, 'week_played');

      // Update W/L on player row
      if (ownerFid) {
        if (won) {
          await sql`UPDATE players SET total_wins = total_wins + 1 WHERE owner_fid = ${ownerFid}`;
        } else {
          await sql`UPDATE players SET total_losses = total_losses + 1 WHERE owner_fid = ${ownerFid}`;
        }
      }
    }
  }

  await sql`UPDATE weeks SET computed_at = NOW() WHERE id = ${weekId}`;

  return NextResponse.json({ ok: true, weekId, teamsScored: teams.length });
}

// Count casts published in the week window
async function fetchCastCount(fid: number, since: Date): Promise<number> {
  if (!process.env.NEYNAR_API_KEY) return 0;
  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150&include_replies=false`,
      { headers: { 'x-api-key': process.env.NEYNAR_API_KEY, accept: 'application/json' } },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const sinceMs = since.getTime();
    return (data.casts ?? []).filter((c: { timestamp: string }) =>
      new Date(c.timestamp).getTime() >= sinceMs,
    ).length;
  } catch {
    return 0;
  }
}
