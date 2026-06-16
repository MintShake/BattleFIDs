import { sql } from '@/lib/db';
import { fastRoundsEnabled } from '@/lib/gameSchedule';

export async function triggerDueFastRoundScoring(origin: string): Promise<string | null> {
  if (!fastRoundsEnabled()) return null;
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;

  const due = await sql`
    SELECT id FROM weeks
    WHERE id LIKE 'R-%'
      AND lock_at IS NOT NULL
      AND ends_at <= NOW()
      AND computed_at IS NULL
    ORDER BY ends_at ASC
    LIMIT 1
  `;
  const weekId = due[0]?.id as string | undefined;
  if (!weekId) return null;

  const url = new URL('/api/cron/score', origin);
  url.searchParams.set('weekId', weekId);

  const res = await fetch(url, {
    headers: { 'x-cron-secret': secret },
    cache: 'no-store',
  }).catch(() => null);

  return res?.ok ? weekId : null;
}
