export type RarityTier = 'Alpha' | 'Legendary' | 'Elite' | 'Rare' | 'Common';

export function rarityFromFid(fid: number): RarityTier {
  if (fid <= 10) return 'Alpha';
  if (fid <= 100) return 'Legendary';
  if (fid <= 1000) return 'Elite';
  if (fid <= 10000) return 'Rare';
  return 'Common';
}

// All stats normalized 0–100.
// supplyRarity and pfpFreshness are the only variant-level differentiators;
// the rest are owner-level (same across all variants of one FID).
export interface CardStats {
  supplyRarity: number;  // FID-based: lower FID → higher score (fixed)
  followerPower: number; // Neynar follower_count normalized
  neynarForce: number;   // Neynar score × 100
  castActivity: number;  // Neynar: blend of reply interactivity + cast volume (30d)
  badgeScore: number;    // power badge (score≥0.5) + verified addresses
  pfpFreshness: number;  // storedAt recency — variant differentiator
  xploraXP: number;      // Xplora XP — reserved, always 0 until wired
}

export type StatKey = keyof CardStats;

export const STAT_LABELS: Record<StatKey, string> = {
  supplyRarity:  'SUPPLY',
  followerPower: 'FOLLOWERS',
  neynarForce:   'NEYNAR',
  castActivity:  'ACTIVITY',
  badgeScore:    'BADGES',
  pfpFreshness:  'PFP FRESH',
  xploraXP:      'XPLORA XP',
};

export const STAT_ORDER: StatKey[] = [
  'supplyRarity',
  'followerPower',
  'neynarForce',
  'castActivity',
  'badgeScore',
  'pfpFreshness',
  'xploraXP',
];

export interface BattleFIDCard {
  // Identity
  fid: number;
  imageId: string;       // unique Faces image ID
  pfpUrl: string;
  thumbUrl: string;
  handle: string;
  displayName: string;

  // Supply mechanics
  maxSupply: number;     // = fid (copies of this variant that can ever exist)
  variantIndex: number;  // 0 = newest PFP, n-1 = oldest
  totalVariants: number; // total PFP images for this FID in Faces

  // Rarity
  rarity: RarityTier;

  // Stats & score
  stats: CardStats;
  battleScore: number;

  // Metadata
  storedAt: string;    // ISO date the PFP was captured
  likeCount: number;   // raw Faces like count for this image
  hasBadge: boolean;   // Neynar score ≥ 0.5 (power badge tier)
}

export interface OwnedCard {
  card: BattleFIDCard;
  serialNumber: number; // which copy (1 … fid)
  openedAt: string;     // ISO date
}
