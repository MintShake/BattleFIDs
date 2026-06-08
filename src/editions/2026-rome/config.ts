import type { Edition } from '../types';

const config: Edition = {
  id:   '2026-rome',
  name: '2026 Edition',

  theme: {
    bgClass:         'bg-grid',
    headerEra:       'FARCASTER · MMXXVI',
    bgImage:         '/bg-roman.png',
    accentPrimary:   '#C9A84C',
    accentSecondary: '#8a63d2',
  },

  rarity: {
    Alpha: {
      tier:   'IMPERATOR',
      border: 'linear-gradient(135deg, #C9A84C, #8a1c3a, #C9A84C, #8a63d2, #C9A84C)',
      header: 'linear-gradient(160deg, #1a0a00, #2a0a10, #100018)',
      glow:   '0 0 50px rgba(201,168,76,0.5), 0 0 100px rgba(138,99,210,0.2)',
      badge:  { background: 'linear-gradient(90deg, #C9A84C, #a07830)', color: '#000' },
      bar:    'linear-gradient(90deg, #C9A84C, #e8c870)',
      accent: '#C9A84C',
    },
    Legendary: {
      tier:   'SENATOR',
      border: 'linear-gradient(135deg, #8a63d2, #5b21b6, #8a63d2)',
      header: 'linear-gradient(160deg, #0e0020, #1a0040, #0e0020)',
      glow:   '0 0 35px rgba(138,99,210,0.55)',
      badge:  { background: 'linear-gradient(90deg, #8a63d2, #6d28d9)', color: '#fff' },
      bar:    'linear-gradient(90deg, #8a63d2, #a78bfa)',
      accent: '#8a63d2',
    },
    Elite: {
      tier:   'CENTURION',
      border: 'linear-gradient(135deg, #cd7f32, #92531a, #cd7f32)',
      header: 'linear-gradient(160deg, #150a00, #221200)',
      glow:   '0 0 28px rgba(205,127,50,0.45)',
      badge:  { background: 'linear-gradient(90deg, #cd7f32, #a06020)', color: '#fff' },
      bar:    'linear-gradient(90deg, #cd7f32, #e8a050)',
      accent: '#cd7f32',
    },
    Rare: {
      tier:   'LEGIONARY',
      border: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
      header: 'linear-gradient(160deg, #0d0020, #18003a)',
      glow:   '0 0 20px rgba(167,139,250,0.35)',
      badge:  { background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', color: '#fff' },
      bar:    'linear-gradient(90deg, #a78bfa, #c4b5fd)',
      accent: '#a78bfa',
    },
    Common: {
      tier:   'CITIZEN',
      border: 'linear-gradient(135deg, #6b5c3e, #4a3f2c)',
      header: 'linear-gradient(160deg, #130f08, #1e1810)',
      glow:   'none',
      badge:  { background: '#3d3020', color: '#a8956a' },
      bar:    'linear-gradient(90deg, #8a7550, #a89060)',
      accent: '#8a7550',
    },
  },

  cardSlots: {
    CAPTAIN:     { color: '#C9A84C', icon: '★' },
    BROADCASTER: { color: '#8a63d2', icon: '📡' },
    PUBLISHER:   { color: '#cd7f32', icon: '✍' },
    AGITATOR:    { color: '#e63946', icon: '⚡' },
    NETWORKER:   { color: '#3a9bdc', icon: '🔗' },
  },

  packs: {
    scroll: {
      name:     'SCROLL',
      subtitle: 'Common to Elite',
      flavour:  '3 cards — common weighted',
    },
    tablet: {
      name:     'TABLET',
      subtitle: 'Rare & above',
      flavour:  '5 cards — no common',
    },
    codex: {
      name:     'CODEX',
      subtitle: 'Legendary & above',
      flavour:  '10 cards — rare minimum',
    },
  },

  league: {
    seasonLabel: 'Roman Season 2026',

    // Roman slot display names
    cardTypeLabels: {
      CAPTAIN:     'Imperator',
      BROADCASTER: 'Herald',
      PUBLISHER:   'Scribe',
      AGITATOR:    'Provocateur',
      NETWORKER:   'Envoy',
    },

    cardTypeDescs: {
      CAPTAIN:     'Any card · rarity multiplies entire team score',
      BROADCASTER: 'Viral reach · scored on recasts received this week',
      PUBLISHER:   'Quality content · scored on likes received this week',
      AGITATOR:    'Stirs debate · scored on replies received this week',
      NETWORKER:   'Builds alliances · scored on replies sent this week',
    },

    // Prestige season — harder caps, bigger captain reward
    captainMult: {
      Alpha:     1.60,
      Legendary: 1.35,
      Elite:     1.20,
      Rare:      1.08,
      Common:    1.00,
    },

    logMax: {
      BROADCASTER: Math.log10(10001),  // 10 000 recasts/week for perfect Herald score
      PUBLISHER:   Math.log10(5001),   // 5 000 likes/week for perfect Scribe score
      AGITATOR:    Math.log10(2001),   // 2 000 replies received
      NETWORKER:   Math.log10(501),    // 500 replies sent
    },

    rules:
      'The Roman season demands excellence. Caps are higher — only the truly viral earn maximum glory. ' +
      'Rare captains command greater multipliers. Ave, Imperator.',
  },
};

export default config;
