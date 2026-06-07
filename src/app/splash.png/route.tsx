import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 200,
          height: 200,
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
          position: 'absolute', top: -30,
          width: 200, height: 130,
          borderRadius: '0 0 50% 50%',
          background: 'radial-gradient(ellipse, rgba(138,99,210,0.55) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Roman arch */}
        <div style={{
          position: 'absolute', top: 20, left: '50%',
          transform: 'translateX(-50%)',
          width: 96, height: 56,
          borderRadius: '0 0 48px 48px',
          border: '1px solid rgba(201,168,76,0.3)',
          borderTop: 'none',
          display: 'flex',
        }} />

        {/* P monogram */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          marginTop: 10,
        }}>
          <div style={{
            fontSize: 82,
            fontWeight: 900,
            lineHeight: 0.88,
            fontFamily: 'sans-serif',
            background: 'linear-gradient(155deg, #C9A84C 0%, #e8d080 40%, #8a63d2 80%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            P
          </div>
          <div style={{
            fontSize: 7,
            fontWeight: 700,
            letterSpacing: '0.45em',
            color: 'rgba(138,99,210,0.5)',
            fontFamily: 'sans-serif',
            marginTop: 3,
          }}>
            PROTOCOL
          </div>
        </div>
      </div>
    ),
    { width: 200, height: 200 },
  );
}
