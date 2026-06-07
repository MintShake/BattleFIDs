export type BadgeRarity = 'legendary' | 'epic' | 'rare' | 'common';

export interface CardBadge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
}

export const BADGE_COLORS: Record<BadgeRarity, { bg: string; color: string; border: string }> = {
  legendary: { bg: 'rgba(201,168,76,0.16)', color: '#C9A84C', border: 'rgba(201,168,76,0.45)' },
  epic:      { bg: 'rgba(138,99,210,0.16)', color: '#c4a4ff', border: 'rgba(138,99,210,0.45)' },
  rare:      { bg: 'rgba(56,189,248,0.10)', color: '#7dd3fc', border: 'rgba(56,189,248,0.35)' },
  common:    { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
};
