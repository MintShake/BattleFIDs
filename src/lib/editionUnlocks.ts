export const EDITION_UNLOCK_POINTS: Record<string, number> = {
  base: 0,
  builders: 1000,
  '2026-rome': 2500,
};

export function pointsRequiredForEdition(editionId: string): number {
  return EDITION_UNLOCK_POINTS[editionId] ?? 5000;
}

export function canUnlockEdition(editionId: string, protocolPoints: number): boolean {
  return protocolPoints >= pointsRequiredForEdition(editionId);
}
