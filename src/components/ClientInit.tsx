'use client';

import { useEffect } from 'react';

export function ClientInit() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const rnwv   = !!w.ReactNativeWebView;
    const parent = window.parent === window ? 'self' : 'iframe';
    const ua     = navigator.userAgent.slice(0, 120);

    // Ping server so we can see in Vercel logs whether client JS is running
    // and what the WebView environment looks like.
    fetch(`/api/client-ping?rnwv=${rnwv}&parent=${parent}&ua=${encodeURIComponent(ua)}&ready=pending`)
      .catch(() => {});

    void import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      // At this point ReactNativeWebView should be injected by the Farcaster
      // native app, so the SDK endpoint IIFE picks webViewEndpoint.
      fetch(`/api/client-ping?rnwv=${rnwv}&parent=${parent}&ua=${encodeURIComponent(ua)}&ready=calling`)
        .catch(() => {});
      sdk.actions.ready();
    });
  }, []);

  return null;
}
