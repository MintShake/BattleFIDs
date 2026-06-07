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
          background: '#08030f',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Purple grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(138,99,210,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(138,99,210,0.07) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />

        {/* Gold radial glow */}
        <div style={{
          position: 'absolute',
          width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)',
        }} />

        {/* Purple glow */}
        <div style={{
          position: 'absolute', top: -200, left: '50%',
          transform: 'translateX(-50%)',
          width: 900, height: 500,
          borderRadius: '0 0 50% 50%',
          background: 'radial-gradient(ellipse, rgba(138,99,210,0.12) 0%, transparent 70%)',
        }} />

        {/* Roman arch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 400, height: 220,
          borderRadius: '0 0 200px 200px',
          border: '1px solid rgba(201,168,76,0.15)',
          borderTop: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 280, height: 160,
          borderRadius: '0 0 140px 140px',
          border: '1px solid rgba(138,99,210,0.12)',
          borderTop: 'none',
        }} />

        {/* Edition text */}
        <div style={{
          fontSize: 16, fontWeight: 700, letterSpacing: '0.45em',
          color: '#5c4070', textTransform: 'uppercase', marginBottom: 16,
        }}>
          ROME PLAYS · MMXXVI
        </div>

        {/* Title */}
        <div style={{
          fontSize: 110, fontWeight: 900, letterSpacing: '0.06em',
          background: 'linear-gradient(90deg, #8a63d2, #C9A84C, #8a63d2)',
          backgroundClip: 'text',
          color: 'transparent',
          lineHeight: 1,
          marginBottom: 18,
        }}>
          BATTLE FIDs
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 20, color: 'rgba(138,99,210,0.5)',
          letterSpacing: '0.3em', textTransform: 'uppercase',
          marginBottom: 40,
        }}>
          Farcaster Identity Battle Cards
        </div>

        {/* Rarity tier pills */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'IMPERATOR', color: '#C9A84C' },
            { label: 'SENATOR',   color: '#8a63d2' },
            { label: 'CENTURION', color: '#cd7f32' },
            { label: 'LEGIONARY', color: '#a78bfa' },
            { label: 'CITIZEN',   color: '#8a7550' },
          ].map(({ label, color }) => (
            <div key={label} style={{
              padding: '6px 16px', borderRadius: 99,
              border: `1px solid ${color}44`,
              color, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
