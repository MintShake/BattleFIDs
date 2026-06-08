import { ImageResponse } from 'next/og';
import { loadCaveat } from '@/lib/ogFont';

export const runtime = 'edge';

const BG = 'https://battle-fids.vercel.app/bg-roman.png';

export async function GET() {
  const caveat = await loadCaveat();

  const img = new ImageResponse(
    (
      <div
        style={{
          width: 200, height: 200,
          background: '#07020e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Roman backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BG} style={{
          position: 'absolute', width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center top',
          opacity: 0.28,
          filter: 'sepia(0.5) hue-rotate(215deg) saturate(1.4) brightness(0.5)',
        }} />

        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,2,14,0.75)', display: 'flex' }} />

        {/* Purple crown glow */}
        <div style={{
          position: 'absolute', top: -30,
          width: 200, height: 130, borderRadius: '0 0 50% 50%',
          background: 'radial-gradient(ellipse, rgba(138,99,210,0.55) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Roman arch */}
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          width: 96, height: 56, borderRadius: '0 0 48px 48px',
          border: '1px solid rgba(201,168,76,0.3)', borderTop: 'none', display: 'flex',
        }} />

        {/* P + crayon */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', marginTop: 10 }}>
          <div style={{
            fontSize: 82, fontWeight: 900, lineHeight: 0.88, fontFamily: 'sans-serif',
            background: 'linear-gradient(155deg, #C9A84C 0%, #e8d080 40%, #8a63d2 80%)',
            backgroundClip: 'text', color: 'transparent',
          }}>
            P
          </div>

          {/* Red crayon */}
          <div style={{
            position: 'absolute',
            right: '-12px',
            bottom: '-8px',
            fontFamily: caveat ? 'Caveat' : 'sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: '#e63946',
            transform: 'rotate(-9deg)',
            transformOrigin: 'left center',
            lineHeight: 1,
            textShadow: '0px 0px 0 rgba(230,57,70,0.4), -1px 1px 0 rgba(230,57,70,0.3)',
            display: 'flex',
          }}>
            2026 edition
          </div>

          <div style={{
            fontSize: 7, fontWeight: 700, letterSpacing: '0.45em',
            color: 'rgba(201,168,76,0.55)', fontFamily: 'sans-serif', marginTop: 3,
          }}>
            PROTOCOL
          </div>
        </div>
      </div>
    ),
    {
      width: 200, height: 200,
      fonts: caveat ? [{ name: 'Caveat', data: caveat, style: 'normal', weight: 700 }] : [],
    },
  );
  img.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return img;
}
