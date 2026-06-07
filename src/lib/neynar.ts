import { NeynarUser, NeynarBulkUsersResponse, CastEngagement } from '@/types/neynar';

const NEYNAR_BASE = 'https://api.neynar.com/v2';

function apiHeaders() {
  return {
    'x-api-key': process.env.NEYNAR_API_KEY ?? '',
    accept: 'application/json',
  };
}

// Server-side: bulk user profiles
export async function fetchNeynarUsersDirect(fids: number[]): Promise<Map<number, NeynarUser>> {
  if (fids.length === 0) return new Map();
  if (!process.env.NEYNAR_API_KEY) return new Map();

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/bulk?fids=${fids.join(',')}`,
      { headers: apiHeaders(), next: { revalidate: 300 } },
    );
    if (!res.ok) return new Map();
    const data: NeynarBulkUsersResponse = await res.json();
    return new Map(data.users.map((u) => [u.fid, u]));
  } catch {
    return new Map();
  }
}

// Server-side: fetch cast engagement (reply interactivity) for one FID
export async function fetchCastEngagement(fid: number): Promise<CastEngagement> {
  if (!process.env.NEYNAR_API_KEY) return { replyCount: 0, castCount30d: 0 };

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/feed/user/replies_and_recasts?fid=${fid}&filter=replies&limit=50`,
      { headers: apiHeaders(), next: { revalidate: 300 } },
    );
    if (!res.ok) return { replyCount: 0, castCount30d: 0 };
    const data = await res.json();
    const replyCount = Array.isArray(data.casts) ? data.casts.length : 0;
    return { replyCount, castCount30d: 0 };
  } catch {
    return { replyCount: 0, castCount30d: 0 };
  }
}

// Fetch engagement for multiple FIDs in parallel
export async function fetchCastEngagements(fids: number[]): Promise<Map<number, CastEngagement>> {
  if (fids.length === 0) return new Map();
  const results = await Promise.all(
    fids.map(async (fid) => [fid, await fetchCastEngagement(fid)] as [number, CastEngagement]),
  );
  return new Map(results);
}

// Server-side: fetch this week's cast activity for scoring
export async function fetchWeeklyStats(fid: number, since: Date): Promise<{
  recastsReceived: number;
  likesReceived:   number;
  repliesReceived: number;
  repliesSent:     number;
}> {
  if (!process.env.NEYNAR_API_KEY) return { recastsReceived: 0, likesReceived: 0, repliesReceived: 0, repliesSent: 0 };

  const sinceMs = since.getTime();

  try {
    const castsRes = await fetch(
      `${NEYNAR_BASE}/farcaster/feed/user/casts?fid=${fid}&limit=150&include_replies=false`,
      { headers: apiHeaders() },
    );
    let recastsReceived = 0, likesReceived = 0, repliesReceived = 0;

    if (castsRes.ok) {
      const data = await castsRes.json();
      for (const cast of (data.casts ?? [])) {
        if (new Date(cast.timestamp).getTime() < sinceMs) break;
        recastsReceived += cast.reactions?.recasts_count ?? 0;
        likesReceived   += cast.reactions?.likes_count   ?? 0;
        repliesReceived += cast.replies?.count           ?? 0;
      }
    }

    const repliesRes = await fetch(
      `${NEYNAR_BASE}/farcaster/feed/user/replies_and_recasts?fid=${fid}&filter=replies&limit=150`,
      { headers: apiHeaders() },
    );
    let repliesSent = 0;
    if (repliesRes.ok) {
      const data = await repliesRes.json();
      for (const cast of (data.casts ?? [])) {
        if (new Date(cast.timestamp).getTime() < sinceMs) break;
        repliesSent++;
      }
    }

    return { recastsReceived, likesReceived, repliesReceived, repliesSent };
  } catch {
    return { recastsReceived: 0, likesReceived: 0, repliesReceived: 0, repliesSent: 0 };
  }
}

// Client-side: calls our proxy (keeps API key server-only)
export async function fetchNeynarUsers(fids: number[]): Promise<Map<number, NeynarUser>> {
  if (fids.length === 0) return new Map();

  try {
    const res = await fetch(`/api/neynar/users?fids=${fids.join(',')}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return new Map();
    const data: NeynarBulkUsersResponse = await res.json();
    return new Map(data.users.map((u) => [u.fid, u]));
  } catch {
    return new Map();
  }
}
