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

export type PlayerTier = 'beginner' | 'confident' | 'pro';

export const TIER_LABELS: Record<PlayerTier, string> = {
  beginner:  'Beginner',
  confident: 'Confident',
  pro:       'Pro',
};

export const TIER_DESC: Record<PlayerTier, string> = {
  beginner:  'Play within your score band — safe, protected competition',
  confident: '50/50 chance of landing in Beginner or Pro — revealed after lock-in',
  pro:       'Open pool — compete against everyone',
};

export type PointsAction =
  | 'app_add'
  | 'pack_open'
  | 'team_lock'
  | 'week_played'
  | 'share'
  | 'invite_sent'
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
  tier:           PlayerTier;
  lockedToPro:    boolean;
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
