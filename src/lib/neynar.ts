import { NeynarUser, NeynarBulkUsersResponse } from '@/types/neynar';

const NEYNAR_BASE = 'https://api.neynar.com/v2';

// Server-side: calls Neynar directly with the API key (use from API routes)
export async function fetchNeynarUsersDirect(fids: number[]): Promise<Map<number, NeynarUser>> {
  if (fids.length === 0) return new Map();
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return new Map();

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/bulk?fids=${fids.join(',')}`,
      {
        headers: { 'x-api-key': apiKey, accept: 'application/json' },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return new Map();
    const data: NeynarBulkUsersResponse = await res.json();
    return new Map(data.users.map((u) => [u.fid, u]));
  } catch {
    return new Map();
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
