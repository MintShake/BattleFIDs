import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const BG = 'https://battle-fids.vercel.app/bg-roman.png';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#08030f',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Photorealistic Roman backdrop — filtered purple */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            opacity: 0.55,
            filter: 'sepia(0.5) hue-rotate(215deg) saturate(1.5) brightness(0.65)',
          }}
        />

        {/* Dark vignette — edges + bottom */}
        <div style={{
          position: 'absolute', inset: 0,
          background: [
            'linear-gradient(180deg, rgba(8,3,15,0.55) 0%, transparent 30%, transparent 60%, rgba(8,3,15,0.75) 100%)',
            'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(8,3,15,0.4) 100%)',
          ].join(', '),
          display: 'flex',
        }} />

        {/* Purple crown glow */}
        <div style={{
          position: 'absolute', top: -200, left: '50%',
          transform: 'translateX(-50%)',
          width: 900, height: 500,
          borderRadius: '0 0 50% 50%',
          background: 'radial-gradient(ellipse, rgba(138,99,210,0.45) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Gold warmth bottom-centre */}
        <div style={{
          position: 'absolute', bottom: -100,
          width: 700, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* Purple grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(138,99,210,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(138,99,210,0.06) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          display: 'flex',
        }} />

        {/* Roman arch pair */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 420, height: 230,
          borderRadius: '0 0 210px 210px',
          border: '1px solid rgba(201,168,76,0.2)',
          borderTop: 'none',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 290, height: 165,
          borderRadius: '0 0 145px 145px',
          border: '1px solid rgba(138,99,210,0.15)',
          borderTop: 'none',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}>
          <div style={{
            fontSize: 15, fontWeight: 700, letterSpacing: '0.5em',
            color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 14,
          }}>
            2026 EDITION
          </div>

          <div style={{
            fontSize: 108, fontWeight: 900, letterSpacing: '0.07em',
            background: 'linear-gradient(90deg, #8a63d2, #C9A84C, #8a63d2)',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
            marginBottom: 18,
          }}>
            THE PROTOCOL
          </div>

          <div style={{
            fontSize: 19, color: 'rgba(138,99,210,0.55)',
            letterSpacing: '0.35em', textTransform: 'uppercase',
            marginBottom: 44,
          }}>
            Farcaster Identity Cards · MMXXVI
          </div>

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
                border: `1px solid ${color}55`,
                background: `${color}10`,
                color, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
              }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
