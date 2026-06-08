'use client'
import dynamic from 'next/dynamic'

const SdkReady = dynamic(() => import('./SdkReady'), { ssr: false })

export function Providers({ children }: { children: React.ReactNode }) {
  return <><SdkReady />{children}</>
}
