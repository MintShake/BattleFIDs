export type PackTier = 'scroll' | 'tablet' | 'codex';

export interface PackDef {
  id: PackTier;
  name: string;
  subtitle: string;
  flavour: string;
  priceUsdc: number;
  accentColor: string;
  dimColor: string;
  borderGradient: string;
  glow: string;
  /** Cards drawn at random from the full FID pool */
  randomCards: number;
  /** Cards drawn from the top-engagement slice of the pool */
  topCards: number;
  /** Fraction of the pool counted as "top" — 0.5 = top 50%, 0.2 = top 20% */
  topFraction: number;
  odds: { label: string; pct: string; pctNum: number; color: string }[];
}

export const PACK_DEFS: PackDef[] = [
  {
    id: 'scroll',
    name: 'SCROLL',
    subtitle: 'Citizen Pack',
    flavour: 'The gates are open to all. Ten random cards from the great registry.',
    priceUsdc: 3,
    randomCards: 10,
    topCards: 0,
    topFraction: 1,
    accentColor: '#8a7550',
    dimColor: '#3d3020',
    borderGradient: 'linear-gradient(145deg, #6b5c3e 0%, #3a3020 50%, #8a7550 100%)',
    glow: 'rgba(138,117,80,0.35)',
    odds: [
      { label: 'Random · full registry', pct: '10/10', pctNum: 100, color: '#8a7550' },
    ],
  },
  {
    id: 'tablet',
    name: 'TABLET',
    subtitle: 'Legionary Pack',
    flavour: 'Soldiers of the Republic. Seven random plus three from the top half.',
    priceUsdc: 8,
    randomCards: 7,
    topCards: 3,
    topFraction: 0.5,
    accentColor: '#a78bfa',
    dimColor: '#2d1a50',
    borderGradient: 'linear-gradient(145deg, #7c3aed 0%, #4c1d95 50%, #a78bfa 100%)',
    glow: 'rgba(167,139,250,0.45)',
    odds: [
      { label: 'Random picks',     pct: '7/10', pctNum: 70, color: '#8a7550' },
      { label: 'Top 50% engaged',  pct: '3/10', pctNum: 30, color: '#a78bfa' },
    ],
  },
  {
    id: 'codex',
    name: 'CODEX',
    subtitle: 'Senator Pack',
    flavour: 'The inner sanctum. Two random, eight from the most active accounts.',
    priceUsdc: 25,
    randomCards: 2,
    topCards: 8,
    topFraction: 0.2,
    accentColor: '#C9A84C',
    dimColor: '#3d2500',
    borderGradient: 'linear-gradient(145deg, #C9A84C 0%, #8a1c3a 50%, #C9A84C 100%)',
    glow: 'rgba(201,168,76,0.6)',
    odds: [
      { label: 'Random picks',     pct: '2/10', pctNum: 20, color: '#8a7550' },
      { label: 'Top 20% engaged',  pct: '8/10', pctNum: 80, color: '#C9A84C' },
    ],
  },
];
