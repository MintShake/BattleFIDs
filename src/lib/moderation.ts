import { sql } from '@/lib/db';

export async function loadBlocklist(): Promise<Set<string>> {
  try {
    const rows = await sql`SELECT image_url FROM pfp_blocklist`;
    return new Set(rows.map(r => r.image_url as string));
  } catch {
    return new Set();
  }
}

export function applyBlocklist(
  pfpUrl: string,
  pfpUrls: string[],
  blocked: Set<string>,
): { pfpUrl: string; pfpUrls: string[] } {
  const filtered = pfpUrls.filter(u => !blocked.has(u));
  const primary = blocked.has(pfpUrl)
    ? (filtered[0] ?? pfpUrl)
    : pfpUrl;
  return { pfpUrl: primary, pfpUrls: filtered };
}
