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
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');

        const inApp = await sdk.isInMiniApp();
        if (!active) return;
        setIsInMiniApp(inApp);

        // context is always available once in mini app — await the Comlink proxy Promise
        const ctx = await sdk.context;
        if (!active) return;

        if (ctx?.user) {
          setUser({
            fid: ctx.user.fid,
            username: ctx.user.username,
            displayName: ctx.user.displayName,
            pfpUrl: ctx.user.pfpUrl,
          });
        }

        if (ctx?.client?.safeAreaInsets) {
          setSafeAreaInsets(ctx.client.safeAreaInsets);
        }

        if (ctx?.client) {
          setAdded(ctx.client.added ?? false);
        }

        // Dismisses the Farcaster splash screen
        await sdk.actions.ready();
      } catch {
        // Running in a regular browser — degrade gracefully
      }
    }

    init();
    return () => { active = false; };
  }, []);

  return { user, isInMiniApp, safeAreaInsets, added };
}
