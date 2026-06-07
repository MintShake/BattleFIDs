export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  follower_count: number;
  following_count: number;
  power_badge?: boolean;
  score: number; // 0–1
  verifications: string[];
  profile?: {
    bio?: { text?: string };
  };
}

export interface NeynarBulkUsersResponse {
  users: NeynarUser[];
}

export interface CastEngagement {
  replyCount: number;    // replies made to others in last ~50 posts
  castCount30d: number;  // total casts in last 30 days
}
