'use client';

import { useEffect, useState } from 'react';
import { dlog } from '@/lib/debug';

export interface MiniAppUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MiniAppState {
  user: MiniAppUser | null;
  isInMiniApp: boolean;
  safeAreaInsets: SafeAreaInsets;
  added: boolean;
}

const DEFAULT_INSETS: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

// Start loading the SDK at module evaluation time — before React renders.
dlog('useMiniApp module: eagerly importing SDK…');
const _sdkPromise: Promise<typeof import('@farcaster/miniapp-sdk')['sdk'] | null> =
  typeof window !== 'undefined'
    ? import('@farcaster/miniapp-sdk')
        .then(m => { dlog('useMiniApp module: SDK loaded ✓'); return m.sdk; })
        .catch(e => { dlog(`useMiniApp module: SDK import failed — ${e}`); return null; })
    : Promise.resolve(null);

export function useMiniApp(): MiniAppState {
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>(DEFAULT_INSETS);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    dlog('useMiniApp: effect start');

    async function init() {
      const sdk = await _sdkPromise;
      if (!sdk) { dlog('useMiniApp: no SDK — not in miniapp'); return; }
      if (!active) return;

      dlog('useMiniApp: checking isInMiniApp…');
      try {
        const inApp = await Promise.race([
          sdk.isInMiniApp(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000)),
        ]);
        if (!active) return;
        dlog(`useMiniApp: isInMiniApp = ${inApp}`);
        setIsInMiniApp(inApp);
      } catch (e) { dlog(`useMiniApp: isInMiniApp error — ${e}`); }

      dlog('useMiniApp: fetching context (3s timeout)…');
      try {
        const ctx = await Promise.race([
          sdk.context,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!active) return;
        if (!ctx) { dlog('useMiniApp: context timed out'); return; }

        dlog(`useMiniApp: context received — fid=${ctx.user?.fid}`);
        if (ctx.user) {
          const fid = ctx.user.fid;
          setUser({ fid, username: ctx.user.username, displayName: ctx.user.displayName, pfpUrl: ctx.user.pfpUrl });
          try { sessionStorage.setItem('miniapp_fid', String(fid)); } catch { /* noop */ }
        }
        if (ctx.client?.safeAreaInsets) setSafeAreaInsets(ctx.client.safeAreaInsets);
        if (ctx.client) setAdded(ctx.client.added ?? false);
      } catch (e) { dlog(`useMiniApp: context error — ${e}`); }
    }

    init();
    return () => { active = false; };
  }, []);

  return { user, isInMiniApp, safeAreaInsets, added };
}
