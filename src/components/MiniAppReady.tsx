'use client';

import { useEffect } from 'react';

// Fires sdk.actions.ready() at layout level so the Farcaster splash
// dismisses on every route, not just on the home page.
export function MiniAppReady() {
  useEffect(() => {
    let cancelled = false;
    async function signal() {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (cancelled) return;
        await sdk.actions.ready({ disableNativeGestures: true });
      } catch {
        // not in a miniapp host — fine
      }
    }
    void signal();
    return () => { cancelled = true; };
  }, []);

  return null;
}
