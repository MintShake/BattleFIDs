import { OwnedCard, BattleFIDCard } from '@/types/card';

const KEY = 'battlefids_collection';

export function getCollection(): OwnedCard[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as OwnedCard[];
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
  localStorage.setItem(KEY, JSON.stringify(updated));
  return newOwned;
}

export function clearCollection(): void {
  localStorage.removeItem(KEY);
}

export function collectionSize(): number {
  return getCollection().length;
}
