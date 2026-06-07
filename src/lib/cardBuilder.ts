import { BattleFIDCard, CardStats, rarityFromFid } from '@/types/card';
import { FidTimeline } from '@/types/faces';
import { NeynarUser } from '@/types/neynar';

// ── stat normalizers ──────────────────────────────────────────────────────────

function supplyRarityScore(fid: number): number {
  // FID 1 → 100, FID 1 000 000 → 0
  return Math.max(0, Math.round(100 * (1 - Math.log10(Math.max(fid, 1)) / 6)));
}

function followerScore(count: number): number {
  return Math.min(100, Math.round((Math.log10(count + 1) / Math.log10(1_000_000)) * 100));
}

function badgeScore(user: NeynarUser | undefined): number {
  if (!user) return 0;
  const badge = user.power_badge ? 50 : 0;
  const verif = Math.min(3, user.verifications?.length ?? 0) * 10;
  return Math.min(100, badge + verif);
}

// storedAt recency: changed today → 100, unchanged for 1 year → 0
// This is the variant differentiator: newer PFP → higher score.
function pfpFreshnessScore(storedAt: string): number {
  const daysSince = (Date.now() - new Date(storedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.round(100 * (1 - daysSince / 365)));
}

function computeBattleScore(stats: CardStats): number {
  return Math.round(
    stats.supplyRarity * 0.25 +
    stats.followerPower * 0.20 +
    stats.neynarForce * 0.20 +
    stats.castActivity * 0.10 +
    stats.badgeScore * 0.10 +
    stats.pfpFreshness * 0.15,
  );
}

// ── builder ───────────────────────────────────────────────────────────────────

export function buildCard(
  timeline: FidTimeline,
  imageIndex: number,
  neynarUser?: NeynarUser,
): BattleFIDCard {
  const image = timeline.images[imageIndex] ?? timeline.images[0];
  const profile = timeline.profile ?? neynarUser;

  const stats: CardStats = {
    supplyRarity: supplyRarityScore(timeline.fid),
    followerPower: followerScore(neynarUser?.follower_count ?? 0),
    neynarForce: Math.round((neynarUser?.score ?? 0) * 100),
    castActivity: 0, // TODO: wire up Neynar cast endpoint
    badgeScore: badgeScore(neynarUser),
    pfpFreshness: pfpFreshnessScore(image.storedAt),
  };

  const handle =
    neynarUser?.username ??
    (profile as { username?: string })?.username ??
    `fid${timeline.fid}`;

  const displayName =
    neynarUser?.display_name ??
    (profile as { displayName?: string })?.displayName ??
    handle;

  return {
    fid: timeline.fid,
    imageId: image.id,
    pfpUrl: image.mediumUrl ?? image.url,
    thumbUrl: image.thumbUrl ?? image.url,
    handle,
    displayName,
    maxSupply: timeline.fid,
    variantIndex: imageIndex,
    totalVariants: timeline.imageCount,
    rarity: rarityFromFid(timeline.fid),
    stats,
    battleScore: computeBattleScore(stats),
    storedAt: image.storedAt,
  };
}

// Expand a timeline into one card per fetched image variant
export function buildAllVariants(
  timeline: FidTimeline,
  neynarUser?: NeynarUser,
): BattleFIDCard[] {
  return timeline.images.map((_, i) => buildCard(timeline, i, neynarUser));
}
