'use client';

export function HeaderOverlay() {
  return (
    <span style={{
      position: 'absolute',
      right: '-0.1em',
      bottom: '-0.8em',
      fontFamily: 'var(--font-geist-mono)',
      fontSize: 'clamp(9px, 2vw, 16px)',
      fontWeight: 700,
      color: '#6b7db3',
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
      pointerEvents: 'none',
      lineHeight: 1,
    }}>
      BASE
    </span>
  );
}
