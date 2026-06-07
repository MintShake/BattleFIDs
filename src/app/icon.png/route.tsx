import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050c18, #0d1f3c)',
          borderRadius: 96,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #00d4ff, #b44fff, #FFD700)',
            backgroundClip: 'text',
            color: 'transparent',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            lineHeight: 1,
          }}
        >
          ⚔
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
