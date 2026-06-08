import type { CardType, RarityTier } from '@/types/card';

export interface RarityStyle {
  tier:   string;  // edition display name e.g. 'CENTURION'
  border: string;
  header: string;
  glow:   string;
  badge:  { background: string; color: string };
  bar:    string;
  accent: string;
}

export interface CardSlotStyle {
  color: string;
  icon:  string;
}

export interface PackFlavour {
  name:     string;
  subtitle: string;
  flavour:  string;
}

export interface EditionTheme {
  bgClass:          string;   // CSS class on <main>
  headerEra:        string;   // e.g. 'FARCASTER · MMXXVI'
  bgImage:          string;   // path to full background image e.g. '/editions/base-bg.jpg'
  accentPrimary:    string;   // dominant accent colour for the edition picker card
  accentSecondary:  string;   // secondary accent colour
}

export interface EditionLeague {
  seasonLabel:    string;
  cardTypeLabels: Record<CardType, string>;
  cardTypeDescs:  Record<CardType, string>;
  captainMult:    Record<RarityTier, number>;
  logMax: {
    BROADCASTER: number;
    PUBLISHER:   number;
    AGITATOR:    number;
    NETWORKER:   number;
  };
  rules: string;
}

export interface Edition {
  id:        string;
  name:      string;
  theme:     EditionTheme;
  rarity:    Record<RarityTier, RarityStyle>;
  cardSlots: Record<CardType, CardSlotStyle>;
  packs: {
    scroll: PackFlavour;
    tablet: PackFlavour;
    codex:  PackFlavour;
  };
  league:    EditionLeague;
}
