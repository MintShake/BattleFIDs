'use client';

export function HeaderOverlay() {
  return (
    <span style={{
      position: 'absolute',
      right: '-0.15em',
      bottom: '-0.85em',
      fontFamily: 'var(--font-geist-mono)',
      fontSize: 'clamp(18px, 3.5vw, 32px)',
      fontWeight: 700,
      color: '#22c55e',
      transform: 'rotate(-6deg)',
      transformOrigin: 'left center',
      lineHeight: 0.85,
      pointerEvents: 'none',
      textShadow: '0 0 12px rgba(34,197,94,0.6), 0 0 24px rgba(34,197,94,0.3)',
      letterSpacing: '0.02em',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '0.65em', color: '#06b6d4', letterSpacing: '0.2em' }}>BUILD</span>
      <span>SEASON</span>
    </span>
  );
}
