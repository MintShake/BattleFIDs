import { CardBadge } from '@/types/badge';
import { BattleFIDCard } from '@/types/card';

const DAY_MS = 86_400_000;

export function computeBadges(card: BattleFIDCard): CardBadge[] {
  const badges: CardBadge[] = [];
  const daysSince = (Date.now() - new Date(card.storedAt).getTime()) / DAY_MS;

  // ── FID prestige ──────────────────────────────────────────────────────────
  if (card.fid <= 10) {
    badges.push({
      id: 'imperator', emoji: '👑', name: 'IMPERATOR',
      description: 'One of the first 10 Farcaster identities ever created. Absolute rarity.',
      rarity: 'legendary',
    });
  } else if (card.fid <= 100) {
    badges.push({
      id: 'ancient', emoji: '🏛', name: 'ANCIENT ONE',
      description: 'FID ≤ 100 — among the founding 100 Farcaster citizens.',
      rarity: 'legendary',
    });
  } else if (card.fid <= 500) {
    badges.push({
      id: 'senator', emoji: '🏺', name: 'SENATOR',
      description: 'FID ≤ 500 — a Farcaster founding-era Senator.',
      rarity: 'epic',
    });
  } else if (card.fid <= 2000) {
    badges.push({
      id: 'pioneer', emoji: '⚔', name: 'PIONEER',
      description: 'FID ≤ 2,000 — an early Farcaster Pioneer.',
      rarity: 'rare',
    });
  }

  // ── Faces community likes ─────────────────────────────────────────────────
  if (card.likeCount >= 200) {
    badges.push({
      id: 'masterpiece', emoji: '🎨', name: 'MASTERPIECE',
      description: `${card.likeCount.toLocaleString()} likes — one of the most celebrated PFPs on Faces.`,
      rarity: 'legendary',
    });
  } else if (card.likeCount >= 50) {
    badges.push({
      id: 'artistic', emoji: '✨', name: 'MOST ARTISTIC',
      description: `${card.likeCount.toLocaleString()} community likes on Faces. A standout identity.`,
      rarity: 'epic',
    });
  } else if (card.likeCount >= 15) {
    badges.push({
      id: 'liked', emoji: '❤', name: 'CROWD FAVOURITE',
      description: `${card.likeCount.toLocaleString()} Faces community likes.`,
      rarity: 'rare',
    });
  }

  // ── PFP history ───────────────────────────────────────────────────────────
  if (card.pfpCount >= 10) {
    badges.push({
      id: 'shapeshifter', emoji: '🦋', name: 'SHAPE SHIFTER',
      description: `${card.pfpCount} profile pictures — a true identity explorer.`,
      rarity: 'epic',
    });
  } else if (card.pfpCount >= 4) {
    badges.push({
      id: 'multiform', emoji: '🖼', name: 'MULTIFORM',
      description: `${card.pfpCount} distinct PFPs captured by Faces.`,
      rarity: 'rare',
    });
  }

  if (false) { // genesis badge retired — no longer variant-specific
  }

  // ── Freshness ─────────────────────────────────────────────────────────────
  if (daysSince <= 14) {
    badges.push({
      id: 'fresh', emoji: '💫', name: 'JUST DROPPED',
      description: 'This PFP was captured within the last 14 days.',
      rarity: 'rare',
    });
  }

  // ── Neynar power ──────────────────────────────────────────────────────────
  if (card.hasBadge) {
    badges.push({
      id: 'power', emoji: '⚡', name: 'POWER USER',
      description: 'Holds a Farcaster power badge — top engagement tier.',
      rarity: 'rare',
    });
  }

  return badges;
}
