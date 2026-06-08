'use client';

export function HeaderOverlay() {
  return (
    <span style={{
      position: 'absolute',
      right: '-0.15em',
      bottom: '-0.85em',
      fontFamily: 'var(--font-caveat)',
      fontSize: 'clamp(22px, 4.5vw, 42px)',
      fontWeight: 700,
      color: '#e63946',
      transform: 'rotate(-8deg)',
      transformOrigin: 'left center',
      lineHeight: 0.82,
      pointerEvents: 'none',
      textShadow: `
        1px 0px 0 rgba(230,57,70,0.4),
        -1px 1px 0 rgba(230,57,70,0.3),
        2px -1px 0 rgba(230,57,70,0.25),
        0px 2px 0 rgba(200,30,50,0.2)
      `,
      letterSpacing: '0.02em',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    }}>
      <span>2026</span>
      <span>edition</span>
    </span>
  );
}
