import type { Edition } from '../types';

const config: Edition = {
  id:   'builders',
  name: 'Builders Edition',

  theme: {
    bgClass:       'bg-grid',
    headerEra:     'FARCASTER · BUILD SEASON',
    bgImage:       '/editions/builders-bg.jpg',
    accentPrimary: '#22c55e',
    accentSecondary: '#06b6d4',
  },

  rarity: {
    Alpha: {
      tier:   'ARCHITECT',
      border: 'linear-gradient(135deg, #22c55e, #06b6d4, #22c55e, #a855f7)',
      header: 'linear-gradient(160deg, #001a0f, #00151f, #0a0015)',
      glow:   '0 0 50px rgba(34,197,94,0.45), 0 0 100px rgba(6,182,212,0.2)',
      badge:  { background: 'linear-gradient(90deg, #22c55e, #06b6d4)', color: '#000' },
      bar:    'linear-gradient(90deg, #22c55e, #4ade80)',
      accent: '#22c55e',
    },
    Legendary: {
      tier:   'ENGINEER',
      border: 'linear-gradient(135deg, #06b6d4, #0284c7)',
      header: 'linear-gradient(160deg, #001520, #002030)',
      glow:   '0 0 35px rgba(6,182,212,0.5)',
      badge:  { background: 'linear-gradient(90deg, #06b6d4, #0284c7)', color: '#fff' },
      bar:    'linear-gradient(90deg, #06b6d4, #67e8f9)',
      accent: '#06b6d4',
    },
    Elite: {
      tier:   'DEVELOPER',
      border: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      header: 'linear-gradient(160deg, #00071a, #000f2a)',
      glow:   '0 0 28px rgba(59,130,246,0.45)',
      badge:  { background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)', color: '#fff' },
      bar:    'linear-gradient(90deg, #3b82f6, #60a5fa)',
      accent: '#3b82f6',
    },
    Rare: {
      tier:   'CONTRIBUTOR',
      border: 'linear-gradient(135deg, #84cc16, #65a30d)',
      header: 'linear-gradient(160deg, #071200, #0f1e00)',
      glow:   '0 0 20px rgba(132,204,22,0.35)',
      badge:  { background: 'linear-gradient(90deg, #84cc16, #65a30d)', color: '#000' },
      bar:    'linear-gradient(90deg, #84cc16, #a3e635)',
      accent: '#84cc16',
    },
    Common: {
      tier:   'BUILDER',
      border: 'linear-gradient(135deg, #374151, #1f2937)',
      header: 'linear-gradient(160deg, #080e08, #0f160f)',
      glow:   'none',
      badge:  { background: '#111827', color: '#4b7a4b' },
      bar:    'linear-gradient(90deg, #374151, #4b7a4b)',
      accent: '#4b7a4b',
    },
  },

  cardSlots: {
    CAPTAIN:     { color: '#22c55e',  icon: '⬡' },
    BROADCASTER: { color: '#a855f7',  icon: '📡' },
    PUBLISHER:   { color: '#06b6d4',  icon: '✍' },
    AGITATOR:    { color: '#f97316',  icon: '⚡' },
    NETWORKER:   { color: '#3b82f6',  icon: '🔗' },
  },

  packs: {
    scroll: {
      name:     'SEED ROUND',
      subtitle: 'Common to Elite',
      flavour:  '3 cards — common weighted',
    },
    tablet: {
      name:     'SERIES A',
      subtitle: 'Rare & above',
      flavour:  '5 cards — no common',
    },
    codex: {
      name:     'MAINNET',
      subtitle: 'Legendary & above',
      flavour:  '10 cards — rare minimum',
    },
  },

  league: {
    seasonLabel: 'Build Season',

    cardTypeLabels: {
      CAPTAIN:     'Lead',
      BROADCASTER: 'Shiller',
      PUBLISHER:   'Writer',
      AGITATOR:    'Debater',
      NETWORKER:   'Connector',
    },

    cardTypeDescs: {
      CAPTAIN:     'Any card · rarity multiplies team score',
      BROADCASTER: 'Amplifies the message · scored on recasts received',
      PUBLISHER:   'Ships the content · scored on likes received',
      AGITATOR:    'Sparks debate · scored on replies received',
      NETWORKER:   'Builds connections · scored on replies sent',
    },

    // Builders favours consistent posters over viral outliers — flatter caps,
    // lower maximums so active-but-not-famous builders can still score high.
    // Captain multiplier is tighter because effort > rarity here.
    captainMult: {
      Alpha:     1.40,
      Legendary: 1.25,
      Elite:     1.12,
      Rare:      1.04,
      Common:    1.00,
    },

    logMax: {
      BROADCASTER: Math.log10(3001),  // lower cap — builders don't need 10K recasts to win
      PUBLISHER:   Math.log10(1501),  // writers score well with moderate likes
      AGITATOR:    Math.log10(501),   // debate is focused, not mass controversy
      NETWORKER:   Math.log10(301),   // reply volume is higher — builders converse
    },

    rules:
      'Build Season rewards consistency over virality. Lower caps mean active builders score well ' +
      'even without massive followings. Connect, ship, debate — every reply counts.',
  },
};

export default config;
