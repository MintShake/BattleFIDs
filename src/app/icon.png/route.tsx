import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#07020e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Purple crown glow */}
        <div style={{
          position: 'absolute', top: -80, left: '50%',
          transform: 'translateX(-50%)',
          width: 480, height: 320,
          borderRadius: '0 0 50% 50%',
          background: 'radial-gradient(ellipse, rgba(138,99,210,0.6) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Gold base warmth */}
        <div style={{
          position: 'absolute', bottom: -80,
          width: 480, height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.22) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* Outer decorative ring */}
        <div style={{
          position: 'absolute',
          width: 420, height: 420,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.2)',
          display: 'flex',
        }} />

        {/* Inner ring */}
        <div style={{
          position: 'absolute',
          width: 360, height: 360,
          borderRadius: '50%',
          border: '1px solid rgba(138,99,210,0.18)',
          display: 'flex',
        }} />

        {/* Roman arch */}
        <div style={{
          position: 'absolute', top: 56, left: '50%',
          transform: 'translateX(-50%)',
          width: 240, height: 140,
          borderRadius: '0 0 120px 120px',
          border: '2px solid rgba(201,168,76,0.28)',
          borderTop: 'none',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 56, left: '50%',
          transform: 'translateX(-50%)',
          width: 170, height: 100,
          borderRadius: '0 0 85px 85px',
          border: '1px solid rgba(138,99,210,0.18)',
          borderTop: 'none',
          display: 'flex',
        }} />

        {/* P monogram */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          marginTop: 24,
        }}>
          <div style={{
            fontSize: 210,
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: '-0.02em',
            fontFamily: 'sans-serif',
            background: 'linear-gradient(155deg, #C9A84C 0%, #e8d080 40%, #8a63d2 75%, #a78bfa 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            P
          </div>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '0.5em',
            color: 'rgba(138,99,210,0.5)',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
            marginTop: 6,
          }}>
            PROTOCOL
          </div>
        </div>

        {/* Corner ticks */}
        {([
          [32, 32, true,  true,  false, false],
          [32, -1, true,  false, false, 32  ],
          [-1, 32, false, true,  32,    false],
          [-1, -1, false, false, 32,    32  ],
        ] as [number, number, boolean, boolean, number | false, number | false][]).map(([t, l, bt, bl, b, r], i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 18, height: 18,
            ...(t >= 0 ? { top: t } : {}),
            ...(l >= 0 ? { left: l } : {}),
            ...(b !== false ? { bottom: b } : {}),
            ...(r !== false ? { right: r } : {}),
            borderTop:    bt ? '2px solid rgba(201,168,76,0.35)' : 'none',
            borderLeft:   bl ? '2px solid rgba(201,168,76,0.35)' : 'none',
            borderBottom: b !== false ? '2px solid rgba(201,168,76,0.35)' : 'none',
            borderRight:  r !== false ? '2px solid rgba(201,168,76,0.35)' : 'none',
            display: 'flex',
          }} />
        ))}
      </div>
    ),
    { width: 512, height: 512 },
  );
}
