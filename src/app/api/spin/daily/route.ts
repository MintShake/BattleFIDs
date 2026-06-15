import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { awardPoints, upsertPlayer } from '@/lib/points';

const OUTCOMES = [
  { label: 'Blank', points: 0, weight: 40 },
  { label: '+5 Protocol Points', points: 5, weight: 34 },
  { label: '+15 Protocol Points', points: 15, weight: 18 },
  { label: '+50 Protocol Points', points: 50, weight: 7 },
  { label: '+150 Protocol Points', points: 150, weight: 1 },
];

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickOutcome() {
  const total = OUTCOMES.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const outcome of OUTCOMES) {
    roll -= outcome.weight;
    if (roll <= 0) return outcome;
  }
  return OUTCOMES[0];
}

async function loadSpin(ownerFid: number | null, deviceId: string | null, spinDay: string) {
  const rows = ownerFid
    ? await sql`SELECT * FROM daily_spins WHERE owner_fid = ${ownerFid} AND spin_day = ${spinDay}`
    : await sql`SELECT * FROM daily_spins WHERE owner_device_id = ${deviceId} AND spin_day = ${spinDay}`;
  return rows[0] ?? null;
}

async function loadPlayerPoints(ownerFid: number | null, deviceId: string | null): Promise<number> {
  const rows = ownerFid
    ? await sql`SELECT protocol_points FROM players WHERE owner_fid = ${ownerFid}`
    : await sql`SELECT protocol_points FROM players WHERE owner_device_id = ${deviceId}`;
  return Number(rows[0]?.protocol_points ?? 0);
}

export async function GET(req: NextRequest) {
  const ownerFid = req.nextUrl.searchParams.get('ownerFid');
  const ownerDeviceId = req.nextUrl.searchParams.get('ownerDeviceId');
  const fid = ownerFid ? parseInt(ownerFid) : null;
  const device = ownerDeviceId ?? null;

  if (!fid && !device) return NextResponse.json({ available: false, spinDay: todayUtc(), odds: OUTCOMES });

  const spinDay = todayUtc();
  const existing = await loadSpin(fid, device, spinDay).catch(() => null);
  return NextResponse.json({
    available: !existing,
    spinDay,
    odds: OUTCOMES,
    today: existing ? {
      points: Number(existing.points_awarded ?? 0),
      label: existing.outcome_label,
      spunAt: existing.created_at,
    } : null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body.ownerFid ? parseInt(body.ownerFid) : null;
    const device = body.ownerDeviceId ?? null;

    if (!fid && !device) return NextResponse.json({ error: 'owner required' }, { status: 400 });

    const spinDay = todayUtc();
    const existing = await loadSpin(fid, device, spinDay);
    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadySpun: true,
        spinDay,
        outcome: {
          points: Number(existing.points_awarded ?? 0),
          label: existing.outcome_label,
        },
        protocolPoints: await loadPlayerPoints(fid, device),
      });
    }

    await upsertPlayer(fid, device);
    const outcome = pickOutcome();

    await sql`
      INSERT INTO daily_spins (owner_fid, owner_device_id, spin_day, points_awarded, outcome_label)
      VALUES (${fid}, ${device}, ${spinDay}, ${outcome.points}, ${outcome.label})
    `;

    if (outcome.points > 0) {
      await awardPoints(fid, device, 'daily_spin', outcome.points, { spinDay, outcome: outcome.label });
    }

    return NextResponse.json({
      ok: true,
      alreadySpun: false,
      spinDay,
      outcome,
      protocolPoints: await loadPlayerPoints(fid, device),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
