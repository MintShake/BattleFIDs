import { sql } from '@/lib/db';
import { PointsAction } from '@/types/league';
import { nanoid } from 'nanoid';

export const POINTS: Record<PointsAction, number> = {
  app_add:          50,
  pack_open:        10,
  team_lock:        15,
  week_played:      20,
  overall_win:      50,  // top-half finish in your group
  rare_card_bonus:  25,  // using a FID 1–100 card in your team
  share:            5,
  invite_sent:      100, // awarded when invited player opens their first pack
  daily_spin:       1,   // variable award uses multiplier = points won
  slot_beat:        1,   // × number of people beaten (applied in scoring run)
};

async function ensureReferralRow(player: Record<string, unknown> | null, ownerFid: number | null, deviceId: string | null) {
  const code = typeof player?.referral_code === 'string' ? player.referral_code : null;
  if (!code) return;

  try {
    await sql`
      INSERT INTO referrals (code, owner_fid, owner_device_id)
      VALUES (${code}, ${ownerFid}, ${deviceId})
      ON CONFLICT (code) DO NOTHING
    `;
  } catch {
    // Some local/dev databases may not have run the league migration yet.
  }
}

// Upsert player row, creating referral code on first visit.
export async function upsertPlayer(ownerFid: number | null, deviceId: string | null) {
  const code = nanoid(8).toUpperCase();

  if (ownerFid) {
    const rows = await sql`
      INSERT INTO players (owner_fid, referral_code)
      VALUES (${ownerFid}, ${code})
      ON CONFLICT (owner_fid) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    await ensureReferralRow(rows[0], ownerFid, deviceId);
    return rows[0];
  }

  if (deviceId) {
    const rows = await sql`
      INSERT INTO players (owner_device_id, referral_code)
      VALUES (${deviceId}, ${code})
      ON CONFLICT (owner_device_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    await ensureReferralRow(rows[0], ownerFid, deviceId);
    return rows[0];
  }

  return null;
}

export async function awardPoints(
  ownerFid: number | null,
  deviceId: string | null,
  action: PointsAction,
  multiplier = 1,
  meta?: Record<string, unknown>,
) {
  const points = Math.round(POINTS[action] * multiplier);
  if (points <= 0) return;

  await sql`
    INSERT INTO protocol_points_log (owner_fid, device_id, action, points, meta)
    VALUES (${ownerFid}, ${deviceId}, ${action}, ${points}, ${meta ? JSON.stringify(meta) : null})
  `;

  if (ownerFid) {
    await sql`
      UPDATE players SET protocol_points = protocol_points + ${points}, updated_at = NOW()
      WHERE owner_fid = ${ownerFid}
    `;
  } else if (deviceId) {
    await sql`
      UPDATE players SET protocol_points = protocol_points + ${points}, updated_at = NOW()
      WHERE owner_device_id = ${deviceId}
    `;
  }
}
