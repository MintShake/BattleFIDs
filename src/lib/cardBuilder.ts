import { BattleFIDCard, CardStats, CardType, rarityFromFid } from '@/types/card';
import { FidTimeline } from '@/types/faces';
import { NeynarUser, CastEngagement } from '@/types/neynar';

// ── stat normalizers ──────────────────────────────────────────────────────────

function supplyRarityScore(fid: number): number {
  return Math.max(0, Math.round(100 * (1 - Math.log10(Math.max(fid, 1)) / 7)));
}

function followerScore(count: number): number {
  return Math.min(100, Math.round((Math.log10(count + 1) / Math.log10(1_000_000)) * 100));
}

function castActivityScore(eng?: CastEngagement): number {
  if (!eng) return 0;
  return Math.min(100, Math.round(eng.replyCount * 4));
}

function badgeScore(user: NeynarUser | undefined): number {
  if (!user) return 0;
  const badge = (user.power_badge ?? (user.score >= 0.5)) ? 40 : 0;
  const scoreBonus = Math.round(user.score * 30);
  const verif = Math.min(2, user.verifications?.length ?? 0) * 10;
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
// One card per FID. The card carries all historical PFP URLs for the cycling
// animation. Latest image (index 0) is the primary display image.

export function buildCard(
  timeline: FidTimeline,
  neynarUser?: NeynarUser,
  engagement?: CastEngagement,
): BattleFIDCard {
  const latestImage = timeline.images[0] ?? { url: '', thumbUrl: '', storedAt: new Date().toISOString(), likeCount: 0 };
  const profile = timeline.profile ?? neynarUser;

  const pfpUrls = timeline.images.map(img => img.mediumUrl ?? img.url);
  const totalLikes = timeline.images.reduce((s, img) => s + (img.likeCount ?? 0), 0);

  const stats: CardStats = {
    supplyRarity:  supplyRarityScore(timeline.fid),
    followerPower: followerScore(neynarUser?.follower_count ?? 0),
    neynarForce:   Math.min(100, Math.round((neynarUser?.score ?? 0) * 100)),
    castActivity:  castActivityScore(engagement),
    badgeScore:    badgeScore(neynarUser),
    pfpFreshness:  pfpFreshnessScore(latestImage.storedAt),
    xploraXP:      0,
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
    fid:          timeline.fid,
    pfpUrl:       latestImage.mediumUrl ?? latestImage.url,
    pfpUrls,
    pfpCount:     timeline.images.length,
    thumbUrl:     latestImage.thumbUrl ?? latestImage.url,
    handle,
    displayName,
    maxSupply:    timeline.fid,
    rarity:       rarityFromFid(timeline.fid),
    stats,
    battleScore:  computeBattleScore(stats),
    cardType:     classifyType(neynarUser, engagement),
    wins:         0,
    losses:       0,
    storedAt:     latestImage.storedAt,
    likeCount:    totalLikes,
    hasBadge:     neynarUser ? (neynarUser.power_badge ?? (neynarUser.score >= 0.5)) : false,
  };
}
