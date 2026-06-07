import { BattleFIDCard, CardStats, CardType, rarityFromFid } from '@/types/card';
import { FidTimeline } from '@/types/faces';
import { NeynarUser, CastEngagement } from '@/types/neynar';

// ── stat normalizers ──────────────────────────────────────────────────────────

function supplyRarityScore(fid: number): number {
  // /7 extends the scale to FID ~10M — ensures all current FIDs (even 3M+) get a non-zero score
  return Math.max(0, Math.round(100 * (1 - Math.log10(Math.max(fid, 1)) / 7)));
}

function followerScore(count: number): number {
  return Math.min(100, Math.round((Math.log10(count + 1) / Math.log10(1_000_000)) * 100));
}

// replyCount = 0–50 from replies_and_recasts sample
// Even 1 reply → 4 pts; 10 replies → 40 pts; 25+ replies → 100 pts
function castActivityScore(eng?: CastEngagement): number {
  if (!eng) return 0;
  return Math.min(100, Math.round(eng.replyCount * 4));
}

function badgeScore(user: NeynarUser | undefined): number {
  if (!user) return 0;
  // power badge tier (score ≥ 0.5) = 40 pts
  const badge = (user.power_badge ?? (user.score >= 0.5)) ? 40 : 0;
  // Neynar score 0–1 → up to 30 pts for everyone
  const scoreBonus = Math.round(user.score * 30);
  // Verified addresses (ETH wallet etc.) → up to 20 pts
  const verif = Math.min(2, user.verifications?.length ?? 0) * 10;
  // Following activity → up to 10 pts (following 100+ people = engaged user)
  const following = Math.min(10, Math.round((Math.log10(user.following_count + 1) / Math.log10(101)) * 10));
  return Math.min(100, badge + scoreBonus + verif + following);
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

// ── type classifier ──────────────────────────────────────────────────────────
// Assigns one of 5 league slot types based on the user's Neynar profile.
// Priority order — first match wins.
//   BROADCASTER: big reach, high Neynar score → likely to go viral
//   PUBLISHER:   power badge + wallet verified → builder/creator energy
//   NETWORKER:   high reply activity → lives in others' conversations
//   AGITATOR:    established voice, generates discussion
//   CAPTAIN:     never assigned here — any rarity card can captain
// All cards are eligible for the CAPTAIN slot regardless of assigned type.

export function classifyType(user: NeynarUser | undefined, engagement: CastEngagement | undefined): CardType {
  if (!user) return 'NETWORKER';

  const followers = user.follower_count ?? 0;
  const score     = user.score ?? 0;
  const replies   = engagement?.replyCount ?? 0;
  const verifs    = user.verifications?.length ?? 0;
  const badge     = user.power_badge ?? score >= 0.5;

  if (score >= 0.6 && followers >= 8000)           return 'BROADCASTER';
  if (badge && verifs >= 1 && followers >= 500)     return 'PUBLISHER';
  if (replies >= 15)                                return 'NETWORKER';
  if (score >= 0.3 && followers >= 300)             return 'AGITATOR';
  return 'NETWORKER';
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
    xploraXP:      0, // reserved — wired up when Xplora integration is ready
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
    cardType:      classifyType(neynarUser, engagement),
    wins:          0,
    losses:        0,
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
