import { NeynarUser, NeynarBulkUsersResponse } from '@/types/neynar';

// Calls our own API proxy (which holds the key server-side)
export async function fetchNeynarUsers(fids: number[]): Promise<Map<number, NeynarUser>> {
  if (fids.length === 0) return new Map();

  try {
    const res = await fetch(`/api/neynar/users?fids=${fids.join(',')}`, {
      next: { revalidate: 300 }, // cache 5 min — stats are live but not real-time
    });
    if (!res.ok) return new Map();
    const data: NeynarBulkUsersResponse = await res.json();
    return new Map(data.users.map((u) => [u.fid, u]));
  } catch {
    return new Map();
  }
}
