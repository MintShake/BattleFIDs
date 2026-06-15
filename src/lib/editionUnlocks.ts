export const EDITION_UNLOCK_POINTS: Record<string, number> = {
  base: 0,
  builders: 300,
  '2026-rome': 750,
};

export function pointsRequiredForEdition(editionId: string): number {
  return EDITION_UNLOCK_POINTS[editionId] ?? 1200;
}

export function canUnlockEdition(editionId: string, protocolPoints: number): boolean {
  return protocolPoints >= pointsRequiredForEdition(editionId);
}
