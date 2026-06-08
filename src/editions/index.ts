// Active edition — change NEXT_PUBLIC_EDITION env var to switch.
// Supported: '2026-rome'
// To add a new edition: create src/editions/<id>/config.ts, register it in EDITIONS below.

import type { Edition } from './types';
import romeConfig from './2026-rome/config';

const EDITIONS: Record<string, Edition> = {
  '2026-rome': romeConfig,
};

export const edition: Edition =
  EDITIONS[process.env.NEXT_PUBLIC_EDITION ?? '2026-rome'] ?? romeConfig;

export type { Edition } from './types';
