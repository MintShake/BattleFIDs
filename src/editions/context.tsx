'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Edition } from './types';
import baseConfig     from './base/config';
import romeConfig     from './2026-rome/config';
import buildersConfig from './builders/config';

// Static registry — used as fallback / for server-side code
export const STATIC_EDITIONS: Record<string, Edition> = {
  'base':      baseConfig,
  '2026-rome': romeConfig,
  'builders':  buildersConfig,
};

// Keep legacy exports so existing imports don't break
export const EDITIONS      = STATIC_EDITIONS;
export const EDITION_ORDER = ['base', '2026-rome', 'builders'] as const;

const STORAGE_KEY = 'selectedEditionId';

export function readStoredEditionId(): string {
  if (typeof window === 'undefined') return 'base';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ?? 'base';
}

export function writeEditionId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
  }
}

// Context — just holds the active Edition object
const EditionContext = createContext<Edition>(baseConfig);

export function useEdition(): Edition {
  return useContext(EditionContext);
}

// Provider — receives a fully resolved Edition (from DB or static)
export function EditionProvider({ children, edition }: { children: ReactNode; edition: Edition }) {
  return (
    <EditionContext.Provider value={edition}>
      {children}
    </EditionContext.Provider>
  );
}
