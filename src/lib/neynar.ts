import { NeynarUser, NeynarBulkUsersResponse, CastEngagement } from '@/types/neynar';

const NEYNAR_BASE = 'https://api.neynar.com/v2';

function useMockNeynar() {
  return !process.env.NEYNAR_API_KEY
    && process.env.NODE_ENV === 'development'
    && (process.env.DATABASE_URL ?? '').includes('localhost');
}

function mockScore(fid: number, salt: number, max: number) {
  const n = Math.abs(Math.sin(fid * 12.9898 + salt * 78.233) * 43758.5453);
  return Math.floor((n - Math.floor(n)) * max);
}

function mockUser(fid: number): NeynarUser {
  return {
    fid,
    username: `fid${fid}`,
    display_name: `fid${fid}`,
    pfp_url: '',
    follower_count: 100 + mockScore(fid, 1, 25000),
    following_count: 10 + mockScore(fid, 2, 2000),
    power_badge: mockScore(fid, 3, 10) > 7,
    score: mockScore(fid, 4, 1000) / 1000,
    verifications: [],
  };
}

function mockWeeklyStats(fid: number) {
  return {
    recastsReceived: mockScore(fid, 5, 80),
    likesReceived:   mockScore(fid, 6, 240),
    repliesReceived: mockScore(fid, 7, 60),
    repliesSent:     mockScore(fid, 8, 120),
  };
}

function apiHeaders() {
  return {
    'x-api-key': process.env.NEYNAR_API_KEY ?? '',
    accept: 'application/json',
  };
}

// Server-side: bulk user profiles — handles any number of FIDs via batching
export async function fetchNeynarUsersDirect(fids: number[]): Promise<Map<number, NeynarUser>> {
  if (fids.length === 0) return new Map();
  if (useMockNeynar()) return new Map(fids.map(fid => [fid, mockUser(fid)]));
  if (!process.env.NEYNAR_API_KEY) return new Map();

  const BATCH = 100;
  const batches: number[][] = [];
  for (let i = 0; i < fids.length; i += BATCH) batches.push(fids.slice(i, i + BATCH));

  try {
    const results = await Promise.all(batches.map(batch =>
      fetch(
        `${NEYNAR_BASE}/farcaster/user/bulk?fids=${batch.join(',')}`,
        { headers: apiHeaders(), next: { revalidate: 300 } },
      ).then(r => r.ok ? r.json() as Promise<NeynarBulkUsersResponse> : { users: [] })
        .catch(() => ({ users: [] as NeynarUser[] }))
    ));
    const map = new Map<number, NeynarUser>();
    for (const data of results) for (const u of data.users) map.set(u.fid, u);
    return map;
  } catch {
    return new Map();
  }
}

// Server-side: fetch cast engagement (reply interactivity) for one FID
export async function fetchCastEngagement(fid: number): Promise<CastEngagement> {
  if (useMockNeynar()) return { replyCount: mockScore(fid, 9, 40), castCount30d: mockScore(fid, 10, 90) };
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
  if (useMockNeynar()) return mockWeeklyStats(fid);
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

// Count non-reply casts published by a FID since a given date
export async function fetchCastCount(fid: number, since: Date): Promise<number> {
  if (useMockNeynar()) return mockScore(fid, 11, 95);
  if (!process.env.NEYNAR_API_KEY) return 0;
  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/feed/user/casts?fid=${fid}&limit=150&include_replies=false`,
      { headers: apiHeaders() },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const sinceMs = since.getTime();
    return (data.casts ?? []).filter((c: { timestamp: string }) =>
      new Date(c.timestamp).getTime() >= sinceMs,
    ).length;
  } catch {
    return 0;
  }
}

// Fetch the appropriate metric for an edition bonus slot
export async function fetchBonusMetric(fid: number, metricType: string, since: Date): Promise<number> {
  switch (metricType) {
    case 'neynar_total_reactions': {
      const s = await fetchWeeklyStats(fid, since);
      return s.likesReceived + s.recastsReceived;
    }
    case 'neynar_embed_casts':
      return fetchEmbedCastCount(fid, since);
    case 'neynar_casts':
      return fetchCastCount(fid, since);
    case 'neynar_likes':
      return (await fetchWeeklyStats(fid, since)).likesReceived;
    case 'neynar_replies':
      return (await fetchWeeklyStats(fid, since)).repliesSent;
    default:
      return 0;
  }
}

// Count casts that have at least one URL/frame embed (proxy for mini-app posts)
async function fetchEmbedCastCount(fid: number, since: Date): Promise<number> {
  if (useMockNeynar()) return mockScore(fid, 12, 35);
  if (!process.env.NEYNAR_API_KEY) return 0;
  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/feed/user/casts?fid=${fid}&limit=150&include_replies=false`,
      { headers: apiHeaders() },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const sinceMs = since.getTime();
    return (data.casts ?? []).filter((c: { timestamp: string; embeds?: unknown[] }) =>
      new Date(c.timestamp).getTime() >= sinceMs && (c.embeds ?? []).length > 0,
    ).length;
  } catch {
    return 0;
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
