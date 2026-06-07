import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050c18',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,212,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.07) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: '0.08em',
            background: 'linear-gradient(90deg, #00d4ff, #b44fff, #FFD700)',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          BATTLE FIDs
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
          }}
        >
          Farcaster Identity Battle Cards
        </div>

        {/* Rarity tags */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 40,
          }}
        >
          {[
            { label: 'ALPHA', color: '#FFD700' },
            { label: 'LEGENDARY', color: '#b44fff' },
            { label: 'ELITE', color: '#00d4ff' },
            { label: 'RARE', color: '#00ff88' },
            { label: 'COMMON', color: '#6b7280' },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{
                padding: '6px 16px',
                borderRadius: 99,
                border: `1px solid ${color}44`,
                color,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.2em',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
