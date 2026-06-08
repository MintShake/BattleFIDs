'use client'
import dynamic from 'next/dynamic'

const SdkReady = dynamic(() => import('./SdkReady'), { ssr: false })

export function ClientInit() {
  return <SdkReady />
}
