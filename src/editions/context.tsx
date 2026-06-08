'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Edition } from './types';
import baseConfig     from './base/config';
import romeConfig     from './2026-rome/config';
import buildersConfig from './builders/config';

export const EDITIONS: Record<string, Edition> = {
  'base':      baseConfig,
  '2026-rome': romeConfig,
  'builders':  buildersConfig,
};

export const EDITION_ORDER = ['base', '2026-rome', 'builders'] as const;

const STORAGE_KEY = 'selectedEditionId';
const DEFAULT_ID  = 'base';

const EditionContext = createContext<Edition>(baseConfig);

export function useEdition(): Edition {
  return useContext(EditionContext);
}

interface Props {
  children: ReactNode;
  initialId?: string;  // pass from page via localStorage read
}

export function EditionProvider({ children, initialId }: Props) {
  const [editionId, setEditionId] = useState<string>(initialId ?? DEFAULT_ID);

  // Sync to localStorage whenever selection changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, editionId);
  }, [editionId]);

  const edition = EDITIONS[editionId] ?? baseConfig;
  return (
    <EditionContext.Provider value={edition}>
      {children}
    </EditionContext.Provider>
  );
}

export function readStoredEditionId(): string {
  if (typeof window === 'undefined') return DEFAULT_ID;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && EDITIONS[stored] ? stored : DEFAULT_ID;
}

export function writeEditionId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
  }
}
