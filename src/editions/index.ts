// Static export for server-side code (scoring APIs, etc.)
// Client UI should use useEdition() from @/editions/context instead.

import type { Edition } from './types';
import baseConfig     from './base/config';
import romeConfig     from './2026-rome/config';
import buildersConfig from './builders/config';

export const EDITIONS_REGISTRY: Record<string, Edition> = {
  'base':      baseConfig,
  '2026-rome': romeConfig,
  'builders':  buildersConfig,
};

// Static default used by server-only scoring code.
// Change NEXT_PUBLIC_EDITION env var to adjust the server-side default.
export const edition: Edition =
  EDITIONS_REGISTRY[process.env.NEXT_PUBLIC_EDITION ?? 'base'] ?? baseConfig;

export type { Edition } from './types';
