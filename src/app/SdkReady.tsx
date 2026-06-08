'use client'
import { sdk } from '@farcaster/miniapp-sdk'

if (typeof window !== 'undefined') {
  const rnwv   = 'ReactNativeWebView' in window ? '1' : '0'
  const parent = window.parent !== window ? '1' : '0'
  const ua     = encodeURIComponent(navigator.userAgent.slice(0, 120))

  fetch(`/api/client-ping?rnwv=${rnwv}&parent=${parent}&ready=before&ua=${ua}`).catch(() => {})

  sdk.actions.ready().then(
    () => fetch(`/api/client-ping?rnwv=${rnwv}&parent=${parent}&ready=done`).catch(() => {}),
    () => fetch(`/api/client-ping?rnwv=${rnwv}&parent=${parent}&ready=err`).catch(() => {}),
  )
}

export default function SdkReady() { return null }
