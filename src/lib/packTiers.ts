export type PackTier = 'scroll' | 'tablet' | 'codex';

export interface SelectionBand {
  /** Lower percentile of the scored pool, 0–100 */
  pctFrom: number;
  /** Upper percentile of the scored pool, 0–100 */
  pctTo: number;
  /** Number of cards to draw from this band */
  count: number;
}

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
  /**
   * Ordered selection bands. Pool is sorted by engagement score desc.
   * Each band is a slice of that sorted pool [pctFrom, pctTo).
   * Bands are processed in order — cards used in earlier bands are
   * excluded from later bands.
   */
  bands: SelectionBand[];
  odds: { label: string; pct: string; pctNum: number; color: string }[];
}

export const PACK_DEFS: PackDef[] = [
  {
    id: 'scroll',
    name: 'SCROLL',
    subtitle: 'Citizen Pack',
    flavour: 'The gates are open to all. Ten random cards from the great registry.',
    priceUsdc: 3,
    bands: [
      { pctFrom: 0, pctTo: 100, count: 10 },
    ],
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
    flavour: 'Seven citizens, three from the upper half, two from the top quarter.',
    priceUsdc: 8,
    bands: [
      { pctFrom: 0,  pctTo: 25,  count: 2 },
      { pctFrom: 25, pctTo: 50,  count: 3 },
      { pctFrom: 50, pctTo: 100, count: 5 },
    ],
    accentColor: '#a78bfa',
    dimColor: '#2d1a50',
    borderGradient: 'linear-gradient(145deg, #7c3aed 0%, #4c1d95 50%, #a78bfa 100%)',
    glow: 'rgba(167,139,250,0.45)',
    odds: [
      { label: 'Top 25% score',  pct: '2/10', pctNum: 20, color: '#C9A84C' },
      { label: 'Top 50% score',  pct: '3/10', pctNum: 30, color: '#a78bfa' },
      { label: 'Random',         pct: '5/10', pctNum: 50, color: '#8a7550' },
    ],
  },
  {
    id: 'codex',
    name: 'CODEX',
    subtitle: 'Senator Pack',
    flavour: 'Two citizens, five from the top quarter, two from the top tenth, one from the elite five percent.',
    priceUsdc: 25,
    bands: [
      { pctFrom: 0,  pctTo: 5,   count: 1 },
      { pctFrom: 5,  pctTo: 10,  count: 2 },
      { pctFrom: 10, pctTo: 25,  count: 5 },
      { pctFrom: 75, pctTo: 100, count: 2 },
    ],
    accentColor: '#C9A84C',
    dimColor: '#3d2500',
    borderGradient: 'linear-gradient(145deg, #C9A84C 0%, #8a1c3a 50%, #C9A84C 100%)',
    glow: 'rgba(201,168,76,0.6)',
    odds: [
      { label: 'Top 5% score',   pct: '1/10', pctNum: 10, color: '#ff9f0a' },
      { label: 'Top 10% score',  pct: '2/10', pctNum: 20, color: '#C9A84C' },
      { label: 'Top 25% score',  pct: '5/10', pctNum: 50, color: '#a78bfa' },
      { label: 'Random',         pct: '2/10', pctNum: 20, color: '#8a7550' },
    ],
  },
];
