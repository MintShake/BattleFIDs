import { OwnedCard, BattleFIDCard } from '@/types/card';

const DEVICE_KEY = 'battlefids_device_id';

// Returns the device UUID, creating one if needed (localStorage fallback for non-mini-app)
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

// Open a pack server-side — persists to Neon, returns 10 OwnedCards
export async function openPackRemote(ownerFid?: number, tier?: string): Promise<OwnedCard[]> {
  const deviceId = getDeviceId();
  const res = await fetch('/api/packs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ownerFid: ownerFid ?? null,
      ownerDeviceId: deviceId,
      tier: tier ?? 'scroll',
    }),
  });
  if (!res.ok) throw new Error(`Pack open failed: ${res.status}`);
  return res.json();
}

// Fetch all owned cards for this user from Neon
export async function fetchCollection(ownerFid?: number): Promise<OwnedCard[]> {
  const deviceId = getDeviceId();
  const param = ownerFid
    ? `ownerFid=${ownerFid}`
    : `ownerDeviceId=${encodeURIComponent(deviceId)}`;

  const res = await fetch(`/api/packs?${param}`);
  if (!res.ok) return [];
  return res.json();
}

// ── localStorage shim (kept for offline fallback / migration) ─────────────────

const LS_KEY = 'battlefids_collection';

export function getCollection(): OwnedCard[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as OwnedCard[];
  } catch {
    return [];
  }
}

export function addToCollection(cards: BattleFIDCard[]): OwnedCard[] {
  const existing = getCollection();
  const newOwned: OwnedCard[] = cards.map((card) => ({
    card,
    serialNumber: Math.floor(Math.random() * card.maxSupply) + 1,
    openedAt: new Date().toISOString(),
  }));
  const updated = [...existing, ...newOwned];
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  return newOwned;
}
