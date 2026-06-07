import { RarityTier } from '@/types/card';

export type PackTier = 'scroll' | 'tablet' | 'codex';

export interface PackDef {
  id: PackTier;
  name: string;
  subtitle: string;
  flavour: string;
  priceUsdc: number;         // primary price — paid in USDC on Base
  accentColor: string;
  dimColor: string;
  borderGradient: string;
  glow: string;
  weights: Record<RarityTier, number>;
  guaranteeRarity?: RarityTier;
  guaranteeCount?: number;
  /** Top N% of each rarity pool by engagement score. 100 = full pool. */
  scorePercentile: number;
  odds: { label: string; pct: string; pctNum: number; color: string }[];
}

export const RARITY_ORDER: RarityTier[] = ['Alpha', 'Legendary', 'Elite', 'Rare', 'Common'];

export const PACK_DEFS: PackDef[] = [
  {
    id: 'scroll',
    name: 'SCROLL',
    subtitle: 'Citizen Pack',
    flavour: 'The gates are open to all. Ten cards from the great registry.',
    priceUsdc: 3,
    scorePercentile: 100,
    accentColor: '#8a7550',
    dimColor: '#3d3020',
    borderGradient: 'linear-gradient(145deg, #6b5c3e 0%, #3a3020 50%, #8a7550 100%)',
    glow: 'rgba(138,117,80,0.35)',
    weights: { Alpha: 0.01, Legendary: 0.04, Elite: 0.10, Rare: 0.25, Common: 0.60 },
    odds: [
      { label: 'Alpha (FID ≤10)', pct: '1%',  pctNum: 1,  color: '#C9A84C' },
      { label: 'Legendary',       pct: '4%',  pctNum: 4,  color: '#8a63d2' },
      { label: 'Elite',           pct: '10%', pctNum: 10, color: '#cd7f32' },
      { label: 'Rare',            pct: '25%', pctNum: 25, color: '#a78bfa' },
      { label: 'Citizen',         pct: '60%', pctNum: 60, color: '#6b5c3e' },
    ],
  },
  {
    id: 'tablet',
    name: 'TABLET',
    subtitle: 'Legionary Pack',
    flavour: 'Soldiers of the Republic. One Elite or better — guaranteed.',
    priceUsdc: 8,
    scorePercentile: 50,
    accentColor: '#a78bfa',
    dimColor: '#2d1a50',
    borderGradient: 'linear-gradient(145deg, #7c3aed 0%, #4c1d95 50%, #a78bfa 100%)',
    glow: 'rgba(167,139,250,0.45)',
    weights: { Alpha: 0.03, Legendary: 0.12, Elite: 0.25, Rare: 0.40, Common: 0.20 },
    guaranteeRarity: 'Elite',
    guaranteeCount: 1,
    odds: [
      { label: 'Alpha (FID ≤10)', pct: '3%',  pctNum: 3,  color: '#C9A84C' },
      { label: 'Legendary',       pct: '12%', pctNum: 12, color: '#8a63d2' },
      { label: 'Elite',           pct: '25%', pctNum: 25, color: '#cd7f32' },
      { label: 'Rare',            pct: '40%', pctNum: 40, color: '#a78bfa' },
      { label: 'Citizen',         pct: '20%', pctNum: 20, color: '#6b5c3e' },
    ],
  },
  {
    id: 'codex',
    name: 'CODEX',
    subtitle: 'Senator Pack',
    flavour: 'The inner sanctum. Legendary guaranteed. Real shiney chance.',
    priceUsdc: 25,
    scorePercentile: 25,
    accentColor: '#C9A84C',
    dimColor: '#3d2500',
    borderGradient: 'linear-gradient(145deg, #C9A84C 0%, #8a1c3a 50%, #C9A84C 100%)',
    glow: 'rgba(201,168,76,0.6)',
    weights: { Alpha: 0.10, Legendary: 0.25, Elite: 0.30, Rare: 0.25, Common: 0.10 },
    guaranteeRarity: 'Legendary',
    guaranteeCount: 1,
    odds: [
      { label: 'Alpha (FID ≤10)', pct: '10%', pctNum: 10, color: '#C9A84C' },
      { label: 'Legendary',       pct: '25%', pctNum: 25, color: '#8a63d2' },
      { label: 'Elite',           pct: '30%', pctNum: 30, color: '#cd7f32' },
      { label: 'Rare',            pct: '25%', pctNum: 25, color: '#a78bfa' },
      { label: 'Citizen',         pct: '10%', pctNum: 10, color: '#6b5c3e' },
    ],
  },
];

export function rollRarities(weights: Record<RarityTier, number>, count: number): RarityTier[] {
  return Array.from({ length: count }, () => {
    const roll = Math.random();
    let cum = 0;
    for (const r of RARITY_ORDER) {
      cum += weights[r];
      if (roll <= cum) return r;
    }
    return 'Common';
  });
}

export function applyGuarantees(
  rarities: RarityTier[],
  guaranteeRarity: RarityTier | undefined,
  guaranteeCount: number | undefined,
): RarityTier[] {
  if (!guaranteeRarity || !guaranteeCount) return rarities;
  const result = [...rarities];
  const tierIdx = RARITY_ORDER.indexOf(guaranteeRarity);
  const qualifying = result.filter(r => RARITY_ORDER.indexOf(r) <= tierIdx).length;
  if (qualifying >= guaranteeCount) return result;

  const needed = guaranteeCount - qualifying;
  let upgraded = 0;
  for (let i = result.length - 1; i >= 0 && upgraded < needed; i--) {
    if (RARITY_ORDER.indexOf(result[i]) > tierIdx) {
      result[i] = guaranteeRarity;
      upgraded++;
    }
  }
  return result;
}
