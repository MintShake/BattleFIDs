import { BattleFIDCard, CardStats, rarityFromFid } from '@/types/card';
import { FidTimeline } from '@/types/faces';
import { NeynarUser, CastEngagement } from '@/types/neynar';

// ── stat normalizers ──────────────────────────────────────────────────────────

function supplyRarityScore(fid: number): number {
  return Math.max(0, Math.round(100 * (1 - Math.log10(Math.max(fid, 1)) / 6)));
}

function followerScore(count: number): number {
  return Math.min(100, Math.round((Math.log10(count + 1) / Math.log10(1_000_000)) * 100));
}

// replyCount = 0–50 replies in last 50 posts sample
function replyScore(replyCount: number): number {
  return Math.min(100, replyCount * 2);
}

// castCount30d from Neynar metrics; log scale ~500/mo → 100
function castVolumeScore(castCount: number): number {
  return Math.min(100, Math.round((Math.log10(castCount + 1) / Math.log10(501)) * 100));
}

function castActivityScore(eng?: CastEngagement): number {
  if (!eng) return 0;
  return Math.round(replyScore(eng.replyCount) * 0.5 + castVolumeScore(eng.castCount30d) * 0.5);
}

function badgeScore(user: NeynarUser | undefined): number {
  if (!user) return 0;
  // power_badge removed from Neynar v2 — use score ≥ 0.5 as badge tier
  const badge = (user.power_badge ?? (user.score >= 0.5)) ? 50 : 0;
  const verif = Math.min(3, user.verifications?.length ?? 0) * 10;
  return Math.min(100, badge + verif);
}

function pfpFreshnessScore(storedAt: string): number {
  const daysSince = (Date.now() - new Date(storedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.round(100 * (1 - daysSince / 365)));
}

function computeBattleScore(stats: CardStats): number {
  return Math.round(
    stats.supplyRarity  * 0.25 +
    stats.followerPower * 0.20 +
    stats.neynarForce   * 0.20 +
    stats.castActivity  * 0.10 +
    stats.badgeScore    * 0.10 +
    stats.pfpFreshness  * 0.15,
  );
}

// ── builder ───────────────────────────────────────────────────────────────────

export function buildCard(
  timeline: FidTimeline,
  imageIndex: number,
  neynarUser?: NeynarUser,
  engagement?: CastEngagement,
): BattleFIDCard {
  const image = timeline.images[imageIndex] ?? timeline.images[0];
  const profile = timeline.profile ?? neynarUser;

  const stats: CardStats = {
    supplyRarity:  supplyRarityScore(timeline.fid),
    followerPower: followerScore(neynarUser?.follower_count ?? 0),
    neynarForce:   Math.min(100, Math.round((neynarUser?.score ?? 0) * 100)),
    castActivity:  castActivityScore(engagement),
    badgeScore:    badgeScore(neynarUser),
    pfpFreshness:  pfpFreshnessScore(image.storedAt),
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
    fid:           timeline.fid,
    imageId:       image.id,
    pfpUrl:        image.mediumUrl ?? image.url,
    thumbUrl:      image.thumbUrl ?? image.url,
    handle,
    displayName,
    maxSupply:     timeline.fid,
    variantIndex:  imageIndex,
    totalVariants: timeline.imageCount,
    rarity:        rarityFromFid(timeline.fid),
    stats,
    battleScore:   computeBattleScore(stats),
    storedAt:      image.storedAt,
    likeCount:     image.likeCount ?? 0,
    hasBadge:      neynarUser ? (neynarUser.power_badge ?? (neynarUser.score >= 0.5)) : false,
  };
}

export function buildAllVariants(
  timeline: FidTimeline,
  neynarUser?: NeynarUser,
  engagement?: CastEngagement,
): BattleFIDCard[] {
  return timeline.images.map((_, i) => buildCard(timeline, i, neynarUser, engagement));
}
