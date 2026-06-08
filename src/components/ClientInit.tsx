'use client'
import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect } from 'react'

// Static import — SDK is bundled into the initial client chunk, not a lazy chunk.
// Newer iOS Farcaster builds block dynamically-loaded script chunks (CSP), so we
// cannot rely on next/dynamic. The endpoint IIFE runs at module-load time in the
// browser (window exists, ReactNativeWebView may or may not be injected yet).
// We call ready() immediately AND from useEffect as a belt-and-suspenders approach.

if (typeof window !== 'undefined') {
  void sdk.actions.ready()
}

export function ClientInit() {
  useEffect(() => {
    void sdk.actions.ready()
  }, [])
  return null
}
