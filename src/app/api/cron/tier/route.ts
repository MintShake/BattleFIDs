import { NextRequest, NextResponse } from 'next/server';
import { currentWeekId } from '@/lib/weeklyScoring';

// Legacy cron kept so old schedules do not fail. Progression is now driven by
// Protocol Point thresholds, not player tiers.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    disabled: true,
    weekId: currentWeekId(),
    reason: 'single_league_points_unlocks',
  });
}
