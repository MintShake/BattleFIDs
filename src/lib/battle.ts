// Legacy battle utilities — superseded by cardBuilder.ts
// Kept only for the battleWinner helper used by CollectionView/page
import { BattleFIDCard, StatKey } from '@/types/card';

export function battleWinner(
  cardA: BattleFIDCard,
  cardB: BattleFIDCard,
  stat: StatKey,
): { winner: BattleFIDCard | null; margin: number } {
  const a = cardA.stats[stat];
  const b = cardB.stats[stat];
  if (a === b) return { winner: null, margin: 0 };
  return { winner: a > b ? cardA : cardB, margin: Math.abs(a - b) };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
