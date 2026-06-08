'use client';

import Image from 'next/image';
import { useEdition } from '@/editions/context';

// Per-edition atmospheric overlay (gradient stack on top of the photo)
const ATMOSPHERE: Record<string, string> = {
  'base': `
    linear-gradient(180deg, #07020e 0%, transparent 30%, transparent 70%, #07020e 100%),
    radial-gradient(ellipse 110% 55% at 50% -5%,  rgba(138, 99,  210, 0.50) 0%, transparent 65%),
    radial-gradient(ellipse 60%  40% at 90%  10%, rgba(100, 80,  220, 0.20) 0%, transparent 60%),
    radial-gradient(ellipse 45%  60% at -5%  50%, rgba(90,  50,  200, 0.25) 0%, transparent 60%),
    radial-gradient(ellipse 50%  35% at 100% 90%, rgba(100, 50,  180, 0.15) 0%, transparent 55%)
  `,
  '2026-rome': `
    linear-gradient(180deg, #07020e 0%, transparent 30%, transparent 70%, #07020e 100%),
    radial-gradient(ellipse 110% 55% at 50% -5%,  rgba(138, 99,  210, 0.55) 0%, transparent 65%),
    radial-gradient(ellipse 60%  40% at 90%  10%, rgba(201, 168,  76, 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 45%  60% at -5%  50%, rgba(90,  50,  200, 0.28) 0%, transparent 60%),
    radial-gradient(ellipse 50%  35% at 100% 90%, rgba(160, 40,  140, 0.18) 0%, transparent 55%)
  `,
  'builders': `
    linear-gradient(180deg, #030e08 0%, transparent 30%, transparent 70%, #030e08 100%),
    radial-gradient(ellipse 110% 55% at 50% -5%,  rgba(34,  197,  94, 0.40) 0%, transparent 65%),
    radial-gradient(ellipse 60%  40% at 90%  10%, rgba(6,   182, 212, 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 45%  60% at -5%  50%, rgba(59,  130, 246, 0.20) 0%, transparent 60%),
    radial-gradient(ellipse 50%  35% at 100% 90%, rgba(34,  197,  94, 0.15) 0%, transparent 55%)
  `,
};

const IMG_FILTER: Record<string, string> = {
  'base':      'sepia(0.2) hue-rotate(240deg) saturate(1.4)',
  '2026-rome': 'sepia(0.4) hue-rotate(220deg) saturate(1.6)',
  'builders':  'sepia(0.3) hue-rotate(100deg)  saturate(1.5)',
};

const BASE_BG: Record<string, string> = {
  'base':      '#07020e',
  '2026-rome': '#07020e',
  'builders':  '#030e08',
};

export function EditionBackdrop() {
  const edition = useEdition();
  const id = edition.id;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      background: BASE_BG[id] ?? '#07020e',
    }}>
      <Image
        src={edition.theme.bgImage}
        alt=""
        fill
        unoptimized
        priority
        style={{
          objectFit: 'cover',
          objectPosition: 'center top',
          opacity: 0.18,
          mixBlendMode: 'luminosity',
          filter: IMG_FILTER[id] ?? IMG_FILTER['base'],
        }}
      />
      {/* Atmospheric colour overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: ATMOSPHERE[id] ?? ATMOSPHERE['base'],
      }} />
    </div>
  );
}
