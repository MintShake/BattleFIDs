export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  follower_count: number;
  following_count: number;
  power_badge: boolean;
  score: number; // 0–1
  verifications: string[];
  profile?: {
    bio?: { text?: string };
  };
}

export interface NeynarBulkUsersResponse {
  users: NeynarUser[];
}
