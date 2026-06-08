'use client';

import dynamic from 'next/dynamic';

const MiniAppReady = dynamic(
  () => import('./MiniAppReady').then(m => ({ default: m.MiniAppReady })),
  { ssr: false },
);

export function ClientInit() {
  return <MiniAppReady />;
}
