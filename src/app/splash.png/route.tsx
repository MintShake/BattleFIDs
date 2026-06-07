import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 200,
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050c18',
          borderRadius: 32,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,212,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #00d4ff, #b44fff)',
            backgroundClip: 'text',
            color: 'transparent',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            lineHeight: 1,
          }}
        >
          BF
        </div>
      </div>
    ),
    { width: 200, height: 200 },
  );
}
