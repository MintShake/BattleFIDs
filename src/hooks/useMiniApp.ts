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

export function useMiniApp(): MiniAppState {
  const [user, setUser]               = useState<MiniAppUser | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>(DEFAULT_INSETS);
  const [added, setAdded]             = useState(false);

  useEffect(() => {
    let active = true;
    dlog('useMiniApp: effect start');

    async function init() {
      // Import lazily inside the effect — NOT at module level.
      // The SDK endpoint IIFE checks window.ReactNativeWebView once and
      // freezes that choice. Importing at module eval time hits it before
      // Farcaster's RN WebView bridge is ready, picking the wrong endpoint.
      dlog('useMiniApp: importing SDK…');
      let sdk: typeof import('@farcaster/miniapp-sdk')['sdk'] | null = null;
      try {
        sdk = (await import('@farcaster/miniapp-sdk')).sdk;
        dlog('useMiniApp: SDK loaded ✓');
      } catch (e) {
        dlog(`useMiniApp: SDK import failed — ${e}`);
        return;
      }
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
