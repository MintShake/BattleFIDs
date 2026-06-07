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
