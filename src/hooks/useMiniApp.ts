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

export function useMiniApp(): MiniAppState {
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>(DEFAULT_INSETS);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      let sdk: Awaited<typeof import('@farcaster/miniapp-sdk')>['sdk'] | null = null;

      try {
        const mod = await import('@farcaster/miniapp-sdk');
        sdk = mod.sdk;
      } catch {
        return; // SDK failed to load (not in a mini app environment)
      }

      // Fire ready() FIRST — this dismisses the Farcaster splash screen.
      // Wrap in its own try so a ready() failure never blocks the rest.
      try {
        await sdk.actions.ready();
      } catch { /* ignore */ }

      if (!active) return;

      try {
        const inApp = await sdk.isInMiniApp();
        if (!active) return;
        setIsInMiniApp(inApp);
      } catch { /* ignore */ }

      // sdk.context is a Comlink-proxied Promise that can hang on Safari 16.1.
      // Race it against a 3-second timeout so the UI always mounts.
      try {
        const ctx = await Promise.race([
          sdk.context,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!active || !ctx) return;

        if (ctx.user) {
          setUser({
            fid: ctx.user.fid,
            username: ctx.user.username,
            displayName: ctx.user.displayName,
            pfpUrl: ctx.user.pfpUrl,
          });
        }
        if (ctx.client?.safeAreaInsets) setSafeAreaInsets(ctx.client.safeAreaInsets);
        if (ctx.client) setAdded(ctx.client.added ?? false);
      } catch { /* context fetch failed — that's OK, ready() already fired */ }
    }

    init();
    return () => { active = false; };
  }, []);

  return { user, isInMiniApp, safeAreaInsets, added };
}
