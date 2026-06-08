'use client'
import { sdk } from '@farcaster/miniapp-sdk'

// Loaded via next/dynamic with ssr:false — never runs on the server.
// Module-level call fires ready() the instant this chunk executes,
// before any React lifecycle delay.
sdk.actions.ready()

export default function SdkReady() {
  return null
}
