'use client';

import { useEffect, useState } from 'react';

export interface MiniAppUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface MiniAppState {
  user: MiniAppUser | null;
  isInMiniApp: boolean;
  sdkReady: boolean;
}

export function useMiniApp(): MiniAppState {
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');

        // isInMiniApp polls for the host handshake (1s timeout)
        const inApp = await sdk.isInMiniApp();
        if (!active) return;
        setIsInMiniApp(inApp);

        if (inApp) {
          const ctx = await sdk.context;
          if (active && ctx?.user) {
            setUser({
              fid: ctx.user.fid,
              username: ctx.user.username,
              displayName: ctx.user.displayName,
              pfpUrl: ctx.user.pfpUrl,
            });
          }
        }

        // Always call ready() — dismisses the Farcaster splash screen.
        // Safe to call outside a mini app context (no-op).
        await sdk.actions.ready();
        if (active) setSdkReady(true);
      } catch (err) {
        // Running in a regular browser — degrade gracefully
        if (active) setSdkReady(false);
      }
    }

    init();
    return () => { active = false; };
  }, []);

  return { user, isInMiniApp, sdkReady };
}
