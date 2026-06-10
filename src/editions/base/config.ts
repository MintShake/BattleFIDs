import type { Edition } from '../types';

const config: Edition = {
  id:   'base',
  name: 'The Protocol',

  theme: {
    bgClass:      'bg-grid',
    headerEra:    'FARCASTER',
    bgImage:      '/editions/base-bg.jpg',
    accentPrimary: '#8a63d2',
    accentSecondary: '#3a9bdc',
  },

  rarity: {
    Alpha: {
      tier:   'GENESIS',
      border: 'linear-gradient(135deg, #a855f7, #6366f1, #a855f7, #ec4899)',
      header: 'linear-gradient(160deg, #0f0020, #1a0050, #0f001a)',
      glow:   '0 0 50px rgba(168,85,247,0.55), 0 0 100px rgba(99,102,241,0.25)',
      badge:  { background: 'linear-gradient(90deg, #a855f7, #6366f1)', color: '#fff' },
      bar:    'linear-gradient(90deg, #a855f7, #c084fc)',
      accent: '#a855f7',
    },
    Legendary: {
      tier:   'ORACLE',
      border: 'linear-gradient(135deg, #8a63d2, #5b21b6, #8a63d2)',
      header: 'linear-gradient(160deg, #0e0020, #1a0040, #0e0020)',
      glow:   '0 0 35px rgba(138,99,210,0.55)',
      badge:  { background: 'linear-gradient(90deg, #8a63d2, #6d28d9)', color: '#fff' },
      bar:    'linear-gradient(90deg, #8a63d2, #a78bfa)',
      accent: '#8a63d2',
    },
    Elite: {
      tier:   'NODE',
      border: 'linear-gradient(135deg, #3a9bdc, #1d4ed8)',
      header: 'linear-gradient(160deg, #00071a, #000f30)',
      glow:   '0 0 28px rgba(58,155,220,0.45)',
      badge:  { background: 'linear-gradient(90deg, #3a9bdc, #1d4ed8)', color: '#fff' },
      bar:    'linear-gradient(90deg, #3a9bdc, #60a5fa)',
      accent: '#3a9bdc',
    },
    Rare: {
      tier:   'VALIDATOR',
      border: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
      header: 'linear-gradient(160deg, #0d0020, #18003a)',
      glow:   '0 0 20px rgba(167,139,250,0.35)',
      badge:  { background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', color: '#fff' },
      bar:    'linear-gradient(90deg, #a78bfa, #c4b5fd)',
      accent: '#a78bfa',
    },
    Common: {
      tier:   'CASTER',
      border: 'linear-gradient(135deg, #4a5568, #2d3748)',
      header: 'linear-gradient(160deg, #0a0a14, #12121e)',
      glow:   'none',
      badge:  { background: '#1a1a2e', color: '#6b7db3' },
      bar:    'linear-gradient(90deg, #4a5568, #6b7db3)',
      accent: '#6b7db3',
    },
  },

  cardSlots: {
    CAPTAIN:     { color: '#a855f7', icon: '◈' },
    BROADCASTER: { color: '#8a63d2', icon: '📡' },
    PUBLISHER:   { color: '#3a9bdc', icon: '✍' },
    AGITATOR:    { color: '#ec4899', icon: '⚡' },
    NETWORKER:   { color: '#10b981', icon: '🔗' },
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
    seasonLabel: 'The Protocol — Base Season',

    cardTypeLabels: {
      CAPTAIN:     'Captain',
      BROADCASTER: 'Broadcaster',
      PUBLISHER:   'Publisher',
      AGITATOR:    'Agitator',
      NETWORKER:   'Networker',
    },

    cardTypeDescs: {
      CAPTAIN:     'Any card · rarity multiplies team score',
      BROADCASTER: 'High follower reach · scored on recasts received',
      PUBLISHER:   'Content quality · scored on likes received',
      AGITATOR:    'Controversial voice · scored on replies received',
      NETWORKER:   'Active replier · scored on replies sent',
    },

    captainMult: {
      Alpha:     1.50,
      Legendary: 1.30,
      Elite:     1.15,
      Rare:      1.05,
      Common:    1.00,
    },

    logMax: {
      BROADCASTER: Math.log10(5001),
      PUBLISHER:   Math.log10(2001),
      AGITATOR:    Math.log10(1001),
      NETWORKER:   Math.log10(201),
    },

    rules:
      'Pick 5 cards from your collection — one per role. Your Captain\'s rarity multiplies the team total. ' +
      'Scores update live based on real Farcaster activity.',
  },
};

export default config;
