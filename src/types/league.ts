export type SlotType = 'casts' | 'replies' | 'followers' | 'score_rise' | 'likes';

export const SLOT_TYPES: SlotType[] = ['casts', 'replies', 'followers', 'score_rise', 'likes'];

export const SLOT_LABELS: Record<SlotType, string> = {
  casts:      'Most Casts',
  replies:    'Most Replies',
  followers:  'New Followers',
  score_rise: 'Score Rise',
  likes:      'Likes Received',
};

export const SLOT_DESC: Record<SlotType, string> = {
  casts:      'Most casts published this week',
  replies:    'Most replies sent this week',
  followers:  'Most new followers gained this week',
  score_rise: 'Biggest Neynar score increase this week',
  likes:      'Most likes received on casts this week',
};

export const SLOT_EMOJI: Record<SlotType, string> = {
  casts:      '📣',
  replies:    '💬',
  followers:  '📈',
  score_rise: '⚡',
  likes:      '❤️',
};

export type PointsAction =
  | 'app_add'
  | 'pack_open'
  | 'team_lock'
  | 'week_played'
  | 'overall_win'     // top-half finish in the league
  | 'top_25'          // top 25 finish on the leaderboard
  | 'rare_card_bonus' // team contains a FID ≤100 card
  | 'share'
  | 'invite_sent'
  | 'daily_spin'
  | 'slot_beat';  // meta: { beats: number }

export interface ProtocolPointsLog {
  id:        string;
  ownerFid:  number | null;
  deviceId:  string | null;
  action:    PointsAction;
  points:    number;
  meta?:     Record<string, unknown>;
  createdAt: string;
}

export interface Player {
  id:             string;
  ownerFid:       number | null;
  ownerDeviceId:  string | null;
  protocolPoints: number;
  totalWins:      number;
  totalLosses:    number;
  referralCode:   string;
  referredBy:     string | null;
}

export interface WeeklyTeamSlots {
  casts_fid:      number | null;
  replies_fid:    number | null;
  followers_fid:  number | null;
  score_rise_fid: number | null;
  likes_fid:      number | null;
}

// ── Edition bonus slots ───────────────────────────────────────────────────────

export type EditionMetricType =
  | 'neynar_total_reactions'   // likesReceived + recastsReceived
  | 'neynar_embed_casts'       // casts with any link/frame embed
  | 'neynar_casts'             // total non-reply casts
  | 'neynar_likes'             // likes received
  | 'neynar_replies';          // replies sent

export interface EditionBonusSlotDef {
  id:          string;   // '{editionId}:{slotKey}'
  editionId:   string;
  slotKey:     string;
  label:       string;
  emoji:       string;
  description: string;
  metricType:  EditionMetricType;
  sortOrder:   number;
}
