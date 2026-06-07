import { CardType, RarityTier } from '@/types/card';

// ── Week ID helpers ────────────────────────────────────────────────────────────
// Weeks run Monday 00:00 UTC → Sunday 23:59 UTC.
// ID format: '2026-W23'

export function currentWeekId(): string {
  return weekIdFromDate(new Date());
}

export function weekIdFromDate(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function weekBounds(weekId: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekId.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000 + (week - 1) * 7 * 86400000);
  const sunday = new Date(monday.getTime() + 7 * 86400000 - 1);
  return { start: monday, end: sunday };
}

// ── Captain multiplier by rarity ──────────────────────────────────────────────
export const CAPTAIN_MULT: Record<RarityTier, number> = {
  Alpha:     1.50,
  Legendary: 1.30,
  Elite:     1.15,
  Rare:      1.05,
  Common:    1.00,
};

// ── Neynar weekly stats ───────────────────────────────────────────────────────
export interface WeeklyStats {
  // Pulled fresh from Neynar for the scoring run
  recastsReceived:  number;  // BROADCASTER
  likesReceived:    number;  // PUBLISHER
  repliesReceived:  number;  // AGITATOR
  repliesSent:      number;  // NETWORKER
}

// ── Log-normalised score (0–100) ─────────────────────────────────────────────
// Using log10 so viral outliers don't flatten everyone else.
// Expected max values calibrated to active-but-not-celebrity Farcaster users.
const LOG_MAX: Record<Exclude<CardType, 'CAPTAIN'>, number> = {
  BROADCASTER: Math.log10(5001),   // 5 000 recasts/week = perfect score
  PUBLISHER:   Math.log10(2001),   // 2 000 likes/week
  AGITATOR:    Math.log10(1001),   // 1 000 replies received/week
  NETWORKER:   Math.log10(201),    // 200 replies sent/week
};

function logNorm(raw: number, type: Exclude<CardType, 'CAPTAIN'>): number {
  if (raw <= 0) return 0;
  return Math.min(100, Math.round((Math.log10(raw + 1) / LOG_MAX[type]) * 100));
}

export function scoreForType(type: CardType, stats: WeeklyStats): number {
  switch (type) {
    case 'BROADCASTER': return logNorm(stats.recastsReceived, 'BROADCASTER');
    case 'PUBLISHER':   return logNorm(stats.likesReceived,   'PUBLISHER');
    case 'AGITATOR':    return logNorm(stats.repliesReceived, 'AGITATOR');
    case 'NETWORKER':   return logNorm(stats.repliesSent,     'NETWORKER');
    case 'CAPTAIN':     return 0; // captain doesn't score individually
  }
}

// ── Team total score ──────────────────────────────────────────────────────────
export interface TeamSlotScore {
  type:  CardType;
  score: number; // 0–100
}

export function teamTotalScore(slots: TeamSlotScore[], captainRarity: RarityTier): number {
  const base = slots
    .filter(s => s.type !== 'CAPTAIN')
    .reduce((sum, s) => sum + s.score, 0);
  return Math.round(base * CAPTAIN_MULT[captainRarity]);
}

// Max possible: (100+100+100+100) × 1.5 = 600
export const MAX_TEAM_SCORE = 600;
