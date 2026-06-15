import { sql } from '@/lib/db';
import { currentWeekId, weekBounds } from '@/lib/weeklyScoring';

const ROUND_MS = 60 * 60 * 1000;
const MIN_ROUND_TEAMS = 2;

export function fastRoundsEnabled() {
  return process.env.GAME_SCHEDULE_MODE === 'fast' || process.env.NODE_ENV === 'development';
}

export function fastRoundId(date = new Date()) {
  return `R-${date.getTime()}`;
}

export function boundsForGameId(id: string) {
  if (id.startsWith('R-')) {
    const millis = Number(id.slice(2));
    const start = Number.isFinite(millis) ? new Date(millis) : new Date();
    return { start, end: new Date(start.getTime() + ROUND_MS) };
  }
  return weekBounds(id);
}

async function ensureWaitingRound() {
  const waiting = await sql`
    SELECT id FROM weeks
    WHERE id LIKE 'R-%' AND computed_at IS NULL AND lock_at IS NULL
    ORDER BY starts_at ASC
    LIMIT 1
  `;
  if (waiting[0]?.id) return waiting[0].id as string;

  const now = new Date();
  const id = fastRoundId(now);
  await sql`
    INSERT INTO weeks (id, starts_at, ends_at, lock_at)
    VALUES (${id}, ${now.toISOString()}, ${new Date(now.getTime() + ROUND_MS).toISOString()}, NULL)
    ON CONFLICT (id) DO NOTHING
  `;
  return id;
}

export async function gameWeekIdForNewTeam(targetWeekId?: string | null) {
  if (!fastRoundsEnabled()) {
    return targetWeekId ?? currentWeekId();
  }
  return ensureWaitingRound();
}

export async function gameWeekIdForDisplay(ownerFid?: number | null, ownerDeviceId?: string | null) {
  if (!fastRoundsEnabled()) return currentWeekId();

  if (ownerFid || ownerDeviceId) {
    const mine = ownerFid
      ? await sql`
          SELECT wt.week_id FROM weekly_teams wt
          JOIN weeks w ON w.id = wt.week_id
          WHERE wt.owner_fid = ${ownerFid} AND wt.week_id LIKE 'R-%' AND w.computed_at IS NULL
          ORDER BY w.lock_at NULLS FIRST, w.starts_at DESC, wt.updated_at DESC
          LIMIT 1
        `
      : await sql`
          SELECT wt.week_id FROM weekly_teams wt
          JOIN weeks w ON w.id = wt.week_id
          WHERE wt.owner_device_id = ${ownerDeviceId} AND wt.week_id LIKE 'R-%' AND w.computed_at IS NULL
          ORDER BY w.lock_at NULLS FIRST, w.starts_at DESC, wt.updated_at DESC
          LIMIT 1
        `;
    if (mine[0]?.week_id) return mine[0].week_id as string;
  }

  const visible = await sql`
    SELECT id FROM weeks
    WHERE id LIKE 'R-%' AND computed_at IS NULL
    ORDER BY lock_at DESC NULLS LAST, starts_at DESC
    LIMIT 1
  `;
  if (visible[0]?.id) return visible[0].id as string;
  return ensureWaitingRound();
}

export async function maybeStartRound(weekId: string) {
  if (!fastRoundsEnabled() || !weekId.startsWith('R-')) return;

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM weekly_teams WHERE week_id = ${weekId}
  `;
  if (Number(count) < MIN_ROUND_TEAMS) return;

  const now = new Date();
  await sql`
    UPDATE weeks
    SET lock_at = COALESCE(lock_at, ${now.toISOString()}),
        starts_at = COALESCE(lock_at, ${now.toISOString()}),
        ends_at = COALESCE(lock_at, ${now.toISOString()}) + INTERVAL '1 hour'
    WHERE id = ${weekId} AND lock_at IS NULL
  `;
}
