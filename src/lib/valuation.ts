import { BattleFIDCard } from '@/types/card';
import { computeBadges } from './badges';

// Base floor price per rarity tier (ETH)
// Anchored to rough NFT market comps for 1-of-1s vs high-supply collections.
const RARITY_BASE: Record<string, number> = {
  Alpha:     2.50,   // FID ≤ 10, near-zero supply
  Legendary: 0.45,   // FID ≤ 100
  Elite:     0.065,  // FID ≤ 1000
  Rare:      0.009,  // FID ≤ 10000
  Common:    0.0015, // FID > 10000
};

// Multipliers stacked on the base:
//   battle score   0.6 – 1.8×  (score 0 = 0.6×, score 100 = 1.8×)
//   badge bonus    +8% per badge
//   serial premium +20% if serial ≤ 10% of max supply
export function estimateValue(card: BattleFIDCard, serialNumber?: number): number {
  const base = RARITY_BASE[card.rarity] ?? 0.001;
  const scoreMult = 0.6 + (card.battleScore / 100) * 1.2;
  const badges = computeBadges(card);
  const badgeMult = 1 + badges.length * 0.08;
  const serialMult = (serialNumber !== undefined && serialNumber <= Math.max(1, Math.floor(card.maxSupply * 0.1)))
    ? 1.2 : 1.0;
  return base * scoreMult * badgeMult * serialMult;
}

const ETH_USD = 3000; // approximate — display only, not used for pricing

export function formatEth(eth: number): string {
  if (eth >= 1)    return `Ξ${eth.toFixed(2)}`;
  if (eth >= 0.01) return `Ξ${eth.toFixed(3)}`;
  return `Ξ${eth.toFixed(4)}`;
}

export function formatUsdc(eth: number): string {
  const usd = eth * ETH_USD;
  if (usd >= 100) return `$${Math.round(usd).toLocaleString()}`;
  if (usd >= 1)   return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(3)}`;
}

export function cardValue(card: BattleFIDCard, serialNumber?: number): string {
  return formatEth(estimateValue(card, serialNumber));
}

export function cardValueUsdc(card: BattleFIDCard, serialNumber?: number): string {
  return formatUsdc(estimateValue(card, serialNumber));
}
