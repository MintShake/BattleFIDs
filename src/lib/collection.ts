import { OwnedCard } from '@/types/card';

// Open a pack server-side — persists to Neon, returns OwnedCards
export async function openPackRemote(ownerFid?: number, tier?: string): Promise<OwnedCard[]> {
  const res = await fetch('/api/packs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ownerFid: ownerFid ?? null,
      tier: tier ?? 'scroll',
    }),
  });
  if (!res.ok) throw new Error(`Pack open failed: ${res.status}`);
  return res.json();
}

// Fetch all owned cards for this player
export async function fetchCollection(ownerFid?: number): Promise<OwnedCard[]> {
  if (!ownerFid) return [];
  const res = await fetch(`/api/packs?ownerFid=${ownerFid}`);
  if (!res.ok) return [];
  return res.json();
}
