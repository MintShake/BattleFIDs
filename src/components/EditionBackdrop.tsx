'use client';

import Image from 'next/image';
import { useEdition } from '@/editions/context';

// Hand-crafted atmosphere for the three built-in editions
const KNOWN_ATMOSPHERE: Record<string, string> = {
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

// Parse a hex colour like #8a63d2 → "138, 99, 210"
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '138, 99, 210';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function dynamicAtmosphere(primary: string, secondary: string, baseBg: string): string {
  const p = hexToRgb(primary);
  const s = hexToRgb(secondary);
  return `
    linear-gradient(180deg, ${baseBg} 0%, transparent 30%, transparent 70%, ${baseBg} 100%),
    radial-gradient(ellipse 110% 55% at 50% -5%,  rgba(${p}, 0.50) 0%, transparent 65%),
    radial-gradient(ellipse 60%  40% at 90%  10%, rgba(${s}, 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 45%  60% at -5%  50%, rgba(${p}, 0.25) 0%, transparent 60%),
    radial-gradient(ellipse 50%  35% at 100% 90%, rgba(${s}, 0.15) 0%, transparent 55%)
  `;
}

function baseBgFromEdition(id: string): string {
  if (id === 'builders') return '#030e08';
  return '#07020e';
}

export function EditionBackdrop() {
  const edition = useEdition();
  const id      = edition.id;

  const atmosphere = KNOWN_ATMOSPHERE[id] ?? dynamicAtmosphere(
    edition.theme.accentPrimary,
    edition.theme.accentSecondary,
    baseBgFromEdition(id),
  );

  const baseBg = baseBgFromEdition(id);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      background: baseBg,
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
          filter: 'sepia(0.3) saturate(1.4)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: atmosphere }} />
    </div>
  );
}
