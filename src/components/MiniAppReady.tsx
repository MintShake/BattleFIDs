'use client';

import { sdk } from '@farcaster/miniapp-sdk';

// Loaded via next/dynamic({ ssr: false }) in layout.tsx — never runs on server.
// Static import means endpoint.js IIFE evaluates here, client-side only,
// when window.ReactNativeWebView is already injected by the Farcaster native app.
// ready() fires immediately when this chunk loads — no useEffect delay.
sdk.actions.ready();

export function MiniAppReady() {
  return null;
}
