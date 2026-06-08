'use client';

import { useEffect, useState } from 'react';

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
// This eliminates the render → useEffect → dynamic-import chain on slow devices.
// Guarded so it's a no-op during SSR.
const _sdkPromise: Promise<typeof import('@farcaster/miniapp-sdk')['sdk'] | null> =
  typeof window !== 'undefined'
    ? import('@farcaster/miniapp-sdk').then(m => m.sdk).catch(() => null)
    : Promise.resolve(null);

export function useMiniApp(): MiniAppState {
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>(DEFAULT_INSETS);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const sdk = await _sdkPromise;
      if (!sdk) return;

      // Fire ready() without await — Warpcast dismisses the splash on message receipt,
      // not on our acknowledgment. Awaiting Comlink's response can hang on iOS 16.
      sdk.actions.ready().catch(() => {});

      if (!active) return;

      try {
        const inApp = await Promise.race([
          sdk.isInMiniApp(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000)),
        ]);
        if (!active) return;
        setIsInMiniApp(inApp);
      } catch { /* ignore */ }

      // sdk.context is a Comlink proxy that can hang on older Safari/WebKit.
      // Race it against a 3-second timeout so UI always becomes interactive.
      try {
        const ctx = await Promise.race([
          sdk.context,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!active || !ctx) return;

        if (ctx.user) {
          const fid = ctx.user.fid;
          setUser({
            fid,
            username:    ctx.user.username,
            displayName: ctx.user.displayName,
            pfpUrl:      ctx.user.pfpUrl,
          });
          // Persist FID so other pages can read it without re-initialising the SDK
          try { sessionStorage.setItem('miniapp_fid', String(fid)); } catch { /* noop */ }
        }
        if (ctx.client?.safeAreaInsets) setSafeAreaInsets(ctx.client.safeAreaInsets);
        if (ctx.client) setAdded(ctx.client.added ?? false);
      } catch { /* context fetch failed — ready() already fired, app is usable */ }
    }

    init();
    return () => { active = false; };
  }, []);

  return { user, isInMiniApp, safeAreaInsets, added };
}
