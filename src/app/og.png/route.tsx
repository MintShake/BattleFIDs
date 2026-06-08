import { ImageResponse } from 'next/og';
import { loadCaveat } from '@/lib/ogFont';

export const runtime = 'edge';

const BG = 'https://the-protocol-xi.vercel.app/bg-roman.png';

export async function GET() {
  const caveat = await loadCaveat();

  const img = new ImageResponse(
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
        {/* Photorealistic Roman backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG}
          style={{
            position: 'absolute',
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center top',
            opacity: 0.3,
            filter: 'sepia(0.5) hue-rotate(215deg) saturate(1.4) brightness(0.5)',
          }}
        />

        {/* Heavy dark overlay — keeps text legible */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,3,15,0.72)', display: 'flex' }} />

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: [
            'linear-gradient(180deg, rgba(8,3,15,0.4) 0%, transparent 35%, transparent 55%, rgba(8,3,15,0.6) 100%)',
            'radial-gradient(ellipse 70% 55% at 50% 50%, transparent 20%, rgba(8,3,15,0.35) 100%)',
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

        {/* Gold warmth */}
        <div style={{
          position: 'absolute', bottom: -100,
          width: 700, height: 300, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* Purple grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(138,99,210,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(138,99,210,0.06) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          display: 'flex',
        }} />

        {/* Roman arch pair */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 420, height: 230, borderRadius: '0 0 210px 210px',
          border: '1px solid rgba(201,168,76,0.2)', borderTop: 'none', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 290, height: 165, borderRadius: '0 0 145px 145px',
          border: '1px solid rgba(138,99,210,0.15)', borderTop: 'none', display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
        }}>
          <div style={{
            fontSize: 15, fontWeight: 700, letterSpacing: '0.5em',
            color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 14,
          }}>
            FARCASTER · MMXXVI
          </div>

          {/* Title + crayon */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 44 }}>
            <div style={{
              fontSize: 108, fontWeight: 900, letterSpacing: '0.07em',
              background: 'linear-gradient(90deg, #8a63d2, #C9A84C, #8a63d2)',
              backgroundClip: 'text', color: 'transparent', lineHeight: 1,
            }}>
              THE PROTOCOL
            </div>

            {/* Red crayon "2026 edition" */}
            <div style={{
              position: 'absolute',
              right: '-20px',
              bottom: '-38px',
              fontFamily: caveat ? 'Caveat' : 'sans-serif',
              fontSize: 62,
              fontWeight: 700,
              color: '#e63946',
              transform: 'rotate(-8deg)',
              transformOrigin: 'left center',
              lineHeight: 1,
              letterSpacing: '0.02em',
              textShadow: '1px 0px 0 rgba(230,57,70,0.4), -1px 1px 0 rgba(230,57,70,0.3), 2px -1px 0 rgba(230,57,70,0.25), 0px 2px 0 rgba(200,30,50,0.2)',
              display: 'flex',
            }}>
              2026 edition
            </div>
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
    {
      width: 1200,
      height: 630,
      fonts: caveat ? [{ name: 'Caveat', data: caveat, style: 'normal', weight: 700 }] : [],
    },
  );
  img.headers.set('Cache-Control', 'no-store');
  return img;
}
