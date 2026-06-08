'use client';

import { useEffect } from 'react';
import { dlog } from '@/lib/debug';

// Fires sdk.actions.ready() at layout level so the Farcaster splash
// dismisses on every route, not just on the home page.
export function MiniAppReady() {
  useEffect(() => {
    let cancelled = false;
    async function signal() {
      dlog('MiniAppReady: importing SDK…');
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (cancelled) { dlog('MiniAppReady: cancelled before ready()'); return; }
        dlog('MiniAppReady: calling ready()…');
        await sdk.actions.ready({ disableNativeGestures: true });
        dlog('MiniAppReady: ready() resolved ✓');
      } catch (e) {
        dlog(`MiniAppReady: error — ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    void signal();
    return () => { cancelled = true; };
  }, []);

  return null;
}
