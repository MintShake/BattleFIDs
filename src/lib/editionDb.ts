import type { Edition } from '@/editions/types';
import type { RarityTier, CardType } from '@/types/card';
import baseConfig     from '@/editions/base/config';
import romeConfig     from '@/editions/2026-rome/config';
import buildersConfig from '@/editions/builders/config';

// Shape of a raw row from the editions table
export interface DbEditionRow {
  id:               string;
  name:             string;
  is_active:        boolean;
  is_default:       boolean;
  sort_order:       number;
  header_era:       string;
  bg_image:         string;
  accent_primary:   string;
  accent_secondary: string;
  description:      string;
  tag_label:        string;
  tag_color:        string;
  embed_image_url:  string | null;
  splash_image_url: string | null;
  rarity_names:     Record<RarityTier, string>;
  slot_labels:      Record<CardType, string>;
  slot_descs:       Record<CardType, string>;
  pack_names:       { scroll: { name: string; subtitle: string; flavour: string }; tablet: { name: string; subtitle: string; flavour: string }; codex: { name: string; subtitle: string; flavour: string } };
  captain_mults:    Record<RarityTier, number>;
  log_maxes:        { BROADCASTER: number; PUBLISHER: number; AGITATOR: number; NETWORKER: number };
  season_label:     string;
  rules:            string;
  created_at:       string;
}

const STATIC_BASES: Record<string, Edition> = {
  'base':      baseConfig,
  '2026-rome': romeConfig,
  'builders':  buildersConfig,
};

// Minimal visual defaults for dynamically created editions
function generateRarityConfig(
  names: Record<RarityTier, string>,
  primary: string,
  secondary: string,
): Edition['rarity'] {
  return {
    Alpha:     { tier: names.Alpha,     border: `linear-gradient(135deg, ${primary}, ${secondary})`,     header: 'linear-gradient(160deg, #0a0015, #0f0025)', glow: `0 0 50px ${primary}80`, badge: { background: `linear-gradient(90deg, ${primary}, ${secondary})`, color: '#000' }, bar: `linear-gradient(90deg, ${primary}, ${secondary})`, accent: primary },
    Legendary: { tier: names.Legendary, border: `linear-gradient(135deg, ${primary}cc, ${primary})`,    header: 'linear-gradient(160deg, #0e0020, #1a0040)', glow: `0 0 35px ${primary}80`, badge: { background: `linear-gradient(90deg, ${primary}cc, ${primary})`, color: '#fff' }, bar: `linear-gradient(90deg, ${primary}cc, ${primary})`, accent: primary },
    Elite:     { tier: names.Elite,     border: `linear-gradient(135deg, ${secondary}, ${secondary}99)`, header: 'linear-gradient(160deg, #00071a, #000f30)', glow: `0 0 28px ${secondary}80`, badge: { background: `linear-gradient(90deg, ${secondary}, ${secondary}99)`, color: '#fff' }, bar: `linear-gradient(90deg, ${secondary}, ${secondary}cc)`, accent: secondary },
    Rare:      { tier: names.Rare,      border: `linear-gradient(135deg, ${primary}99, ${primary})`,    header: 'linear-gradient(160deg, #0d0020, #18003a)', glow: `0 0 20px ${primary}55`, badge: { background: `linear-gradient(90deg, ${primary}99, ${primary})`, color: '#fff' }, bar: `linear-gradient(90deg, ${primary}99, ${primary}cc)`, accent: primary },
    Common:    { tier: names.Common,    border: 'linear-gradient(135deg, #4a5568, #2d3748)',            header: 'linear-gradient(160deg, #0a0a14, #12121e)', glow: 'none', badge: { background: '#1a1a2e', color: '#6b7db3' }, bar: 'linear-gradient(90deg, #4a5568, #6b7db3)', accent: '#6b7db3' },
  };
}

const DEFAULT_RARITY_NAMES: Record<RarityTier, string> = {
  Alpha: 'GENESIS', Legendary: 'ORACLE', Elite: 'NODE', Rare: 'VALIDATOR', Common: 'CASTER',
};
const DEFAULT_CAPTAIN_MULTS: Record<RarityTier, number> = {
  Alpha: 1.50, Legendary: 1.30, Elite: 1.15, Rare: 1.05, Common: 1.00,
};
const DEFAULT_LOG_MAXES = {
  BROADCASTER: Math.log10(5001),
  PUBLISHER:   Math.log10(2001),
  AGITATOR:    Math.log10(1001),
  NETWORKER:   Math.log10(201),
};
const DEFAULT_SLOT_LABELS: Record<CardType, string> = {
  CAPTAIN: 'Captain', BROADCASTER: 'Broadcaster', PUBLISHER: 'Publisher', AGITATOR: 'Agitator', NETWORKER: 'Networker',
};
const DEFAULT_SLOT_DESCS: Record<CardType, string> = {
  CAPTAIN:     'Any card · rarity multiplies team score',
  BROADCASTER: 'Viral reach · scored on recasts received',
  PUBLISHER:   'Content quality · scored on likes received',
  AGITATOR:    'Stirs debate · scored on replies received',
  NETWORKER:   'Builds alliances · scored on replies sent',
};
const DEFAULT_PACKS = {
  scroll: { name: 'SCROLL', subtitle: 'Common to Elite',     flavour: '3 cards — common weighted' },
  tablet: { name: 'TABLET', subtitle: 'Rare & above',        flavour: '5 cards — no common' },
  codex:  { name: 'CODEX',  subtitle: 'Legendary & above',   flavour: '10 cards — rare minimum' },
};

export function dbToEdition(row: DbEditionRow): Edition {
  const staticBase = STATIC_BASES[row.id];

  // Merge: DB wins on configurable fields; TypeScript config wins on visual detail for known editions
  const rarityNames: Record<RarityTier, string> = {
    ...DEFAULT_RARITY_NAMES,
    ...(row.rarity_names ?? {}),
  };
  const captainMults: Record<RarityTier, number> = {
    ...DEFAULT_CAPTAIN_MULTS,
    ...(row.captain_mults ?? {}),
  };
  const logMaxes = { ...DEFAULT_LOG_MAXES, ...(row.log_maxes ?? {}) };
  const slotLabels = { ...DEFAULT_SLOT_LABELS, ...(row.slot_labels ?? {}) };
  const slotDescs  = { ...DEFAULT_SLOT_DESCS,  ...(row.slot_descs  ?? {}) };
  const packNames  = { ...DEFAULT_PACKS,        ...(row.pack_names  ?? {}) };

  const rarity = staticBase
    ? {
        Alpha:     { ...staticBase.rarity.Alpha,     tier: rarityNames.Alpha     },
        Legendary: { ...staticBase.rarity.Legendary, tier: rarityNames.Legendary },
        Elite:     { ...staticBase.rarity.Elite,     tier: rarityNames.Elite     },
        Rare:      { ...staticBase.rarity.Rare,      tier: rarityNames.Rare      },
        Common:    { ...staticBase.rarity.Common,    tier: rarityNames.Common    },
      }
    : generateRarityConfig(rarityNames, row.accent_primary, row.accent_secondary);

  const cardSlots = staticBase ? staticBase.cardSlots : {
    CAPTAIN:     { color: row.accent_primary,   icon: '◈' },
    BROADCASTER: { color: row.accent_primary,   icon: '📡' },
    PUBLISHER:   { color: row.accent_secondary, icon: '✍' },
    AGITATOR:    { color: '#e63946',            icon: '⚡' },
    NETWORKER:   { color: row.accent_secondary, icon: '🔗' },
  };

  return {
    id:   row.id,
    name: row.name,
    theme: {
      bgClass:         'bg-grid',
      headerEra:       row.header_era,
      bgImage:         row.bg_image,
      accentPrimary:   row.accent_primary,
      accentSecondary: row.accent_secondary,
    },
    rarity,
    cardSlots,
    packs: packNames,
    league: {
      seasonLabel:    row.season_label,
      cardTypeLabels: slotLabels as Record<CardType, string>,
      cardTypeDescs:  slotDescs  as Record<CardType, string>,
      captainMult:    captainMults,
      logMax:         logMaxes,
      rules:          row.rules,
    },
    ui: {
      tagLabel:    row.tag_label   ?? 'LIVE',
      tagColor:    row.tag_color   ?? '#22c55e',
      description: row.description ?? '',
      isDefault:   row.is_default  ?? false,
      sortOrder:   row.sort_order  ?? 0,
    },
  };
}

// Seed rows for existing editions (used during migration)
export const EDITION_SEEDS = [
  {
    id: 'base',
    name: 'The Protocol',
    is_default: true,
    sort_order: 0,
    header_era: 'FARCASTER',
    bg_image: '/editions/base-bg.jpg',
    accent_primary: '#8a63d2',
    accent_secondary: '#3a9bdc',
    description: 'The core Farcaster card game. Collect identities, build teams, battle weekly.',
    tag_label: 'LIVE',
    tag_color: '#22c55e',
    embed_image_url: null,
    splash_image_url: null,
    rarity_names: JSON.stringify({ Alpha: 'GENESIS', Legendary: 'ORACLE', Elite: 'NODE', Rare: 'VALIDATOR', Common: 'CASTER' }),
    slot_labels: JSON.stringify({ CAPTAIN: 'Captain', BROADCASTER: 'Broadcaster', PUBLISHER: 'Publisher', AGITATOR: 'Agitator', NETWORKER: 'Networker' }),
    slot_descs: JSON.stringify({ CAPTAIN: 'Any card · rarity multiplies team score', BROADCASTER: 'Viral reach · scored on recasts received', PUBLISHER: 'Content quality · scored on likes received', AGITATOR: 'Stirs debate · scored on replies received', NETWORKER: 'Builds alliances · scored on replies sent' }),
    pack_names: JSON.stringify({ scroll: { name: 'SCROLL', subtitle: 'Common to Elite', flavour: '3 cards — common weighted' }, tablet: { name: 'TABLET', subtitle: 'Rare & above', flavour: '5 cards — no common' }, codex: { name: 'CODEX', subtitle: 'Legendary & above', flavour: '10 cards — rare minimum' } }),
    captain_mults: JSON.stringify({ Alpha: 1.50, Legendary: 1.30, Elite: 1.15, Rare: 1.05, Common: 1.00 }),
    log_maxes: JSON.stringify({ BROADCASTER: Math.log10(5001), PUBLISHER: Math.log10(2001), AGITATOR: Math.log10(1001), NETWORKER: Math.log10(201) }),
    season_label: 'The Protocol — Base Season',
    rules: "Pick 5 cards from your collection — one per role. Your Captain's rarity multiplies the team total. Scores update live based on real Farcaster activity.",
  },
  {
    id: '2026-rome',
    name: '2026 Edition',
    is_default: false,
    sort_order: 1,
    header_era: 'FARCASTER · MMXXVI',
    bg_image: '/bg-roman.png',
    accent_primary: '#C9A84C',
    accent_secondary: '#8a63d2',
    description: 'Imperial Rome meets the protocol. IMPERATOR through CITIZEN — glory awaits.',
    tag_label: '2026 EDITION',
    tag_color: '#C9A84C',
    embed_image_url: null,
    splash_image_url: null,
    rarity_names: JSON.stringify({ Alpha: 'IMPERATOR', Legendary: 'SENATOR', Elite: 'CENTURION', Rare: 'LEGIONARY', Common: 'CITIZEN' }),
    slot_labels: JSON.stringify({ CAPTAIN: 'Imperator', BROADCASTER: 'Herald', PUBLISHER: 'Scribe', AGITATOR: 'Provocateur', NETWORKER: 'Envoy' }),
    slot_descs: JSON.stringify({ CAPTAIN: 'Any card · rarity multiplies entire team score', BROADCASTER: 'Viral reach · scored on recasts received this week', PUBLISHER: 'Quality content · scored on likes received this week', AGITATOR: 'Stirs debate · scored on replies received this week', NETWORKER: 'Builds alliances · scored on replies sent this week' }),
    pack_names: JSON.stringify({ scroll: { name: 'SCROLL', subtitle: 'Common to Elite', flavour: '3 cards — common weighted' }, tablet: { name: 'TABLET', subtitle: 'Rare & above', flavour: '5 cards — no common' }, codex: { name: 'CODEX', subtitle: 'Legendary & above', flavour: '10 cards — rare minimum' } }),
    captain_mults: JSON.stringify({ Alpha: 1.60, Legendary: 1.35, Elite: 1.20, Rare: 1.08, Common: 1.00 }),
    log_maxes: JSON.stringify({ BROADCASTER: Math.log10(10001), PUBLISHER: Math.log10(5001), AGITATOR: Math.log10(2001), NETWORKER: Math.log10(501) }),
    season_label: 'Roman Season 2026',
    rules: 'The Roman season demands excellence. Caps are higher — only the truly viral earn maximum glory. Rare captains command greater multipliers. Ave, Imperator.',
  },
  {
    id: 'builders',
    name: 'Builders Edition',
    is_default: false,
    sort_order: 2,
    header_era: 'FARCASTER · BUILD SEASON',
    bg_image: '/editions/builders-bg.jpg',
    accent_primary: '#22c55e',
    accent_secondary: '#06b6d4',
    description: 'Build season is live. ARCHITECTs to BUILDERs compete for supremacy.',
    tag_label: 'BUILD SEASON',
    tag_color: '#06b6d4',
    embed_image_url: null,
    splash_image_url: null,
    rarity_names: JSON.stringify({ Alpha: 'ARCHITECT', Legendary: 'ENGINEER', Elite: 'DEVELOPER', Rare: 'CONTRIBUTOR', Common: 'BUILDER' }),
    slot_labels: JSON.stringify({ CAPTAIN: 'Lead', BROADCASTER: 'Shiller', PUBLISHER: 'Writer', AGITATOR: 'Debater', NETWORKER: 'Connector' }),
    slot_descs: JSON.stringify({ CAPTAIN: 'Any card · rarity multiplies team score', BROADCASTER: 'Amplifies the message · scored on recasts received', PUBLISHER: 'Ships the content · scored on likes received', AGITATOR: 'Sparks debate · scored on replies received', NETWORKER: 'Builds connections · scored on replies sent' }),
    pack_names: JSON.stringify({ scroll: { name: 'SEED ROUND', subtitle: 'Common to Elite', flavour: '3 cards — common weighted' }, tablet: { name: 'SERIES A', subtitle: 'Rare & above', flavour: '5 cards — no common' }, codex: { name: 'MAINNET', subtitle: 'Legendary & above', flavour: '10 cards — rare minimum' } }),
    captain_mults: JSON.stringify({ Alpha: 1.40, Legendary: 1.25, Elite: 1.12, Rare: 1.04, Common: 1.00 }),
    log_maxes: JSON.stringify({ BROADCASTER: Math.log10(3001), PUBLISHER: Math.log10(1501), AGITATOR: Math.log10(501), NETWORKER: Math.log10(301) }),
    season_label: 'Build Season',
    rules: 'Build Season rewards consistency over virality. Lower caps mean active builders score well even without massive followings. Connect, ship, debate — every reply counts.',
  },
];
