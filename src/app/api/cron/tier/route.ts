import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { currentWeekId } from '@/lib/weeklyScoring';

// GET /api/cron/tier
// Runs daily. Computes the Pro threshold (90th percentile avg_team_score),
// promotes any player at or above it to Pro (locked), and resolves the
// Confident coin flip for the current week's locked teams.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const weekId = currentWeekId();

  // Pull all locked teams for this week with their avg_team_score
  const teams = await sql`
    SELECT owner_fid, owner_device_id, avg_team_score, chosen_tier, assigned_group
    FROM weekly_teams
    WHERE week_id = ${weekId}
    ORDER BY avg_team_score DESC
  `;

  if (teams.length === 0) {
    return NextResponse.json({ ok: true, weekId, teamsChecked: 0 });
  }

  // 90th percentile: top 10% are Pro
  const proThresholdIdx = Math.floor(teams.length * 0.1);
  const proThreshold    = Number(teams[proThresholdIdx]?.avg_team_score ?? 0);

  // Persist threshold on the week record
  await sql`UPDATE weeks SET pro_threshold = ${proThreshold} WHERE id = ${weekId}`;

  let promoted  = 0;
  let flipped   = 0;

  for (const team of teams) {
    const score = Number(team.avg_team_score);
    const fid   = team.owner_fid    ? Number(team.owner_fid)    : null;
    const device = team.owner_device_id ?? null;

    // Promote to Pro if at or above threshold
    if (score >= proThreshold && proThreshold > 0) {
      if (fid) {
        await sql`
          UPDATE players SET tier = 'pro', locked_to_pro = TRUE, updated_at = NOW()
          WHERE owner_fid = ${fid} AND locked_to_pro = FALSE
        `;
      } else if (device) {
        await sql`
          UPDATE players SET tier = 'pro', locked_to_pro = TRUE, updated_at = NOW()
          WHERE owner_device_id = ${device} AND locked_to_pro = FALSE
        `;
      }
      promoted++;
    }

    // Resolve Confident coin flip (only once — assigned_group is null until set)
    if (team.chosen_tier === 'confident' && !team.assigned_group) {
      const group = Math.random() < 0.5 ? 'beginner' : 'pro';
      if (fid) {
        await sql`UPDATE weekly_teams SET assigned_group = ${group} WHERE week_id = ${weekId} AND owner_fid = ${fid}`;
      } else if (device) {
        await sql`UPDATE weekly_teams SET assigned_group = ${group} WHERE week_id = ${weekId} AND owner_device_id = ${device}`;
      }
      flipped++;
    }
  }

  return NextResponse.json({ ok: true, weekId, teamsChecked: teams.length, proThreshold, promoted, flipped });
}
