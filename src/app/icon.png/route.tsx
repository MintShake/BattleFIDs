import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const BG = 'https://battle-fids.vercel.app/bg-roman.png';

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
        {/* Photorealistic Roman backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            opacity: 0.28,
            filter: 'sepia(0.5) hue-rotate(215deg) saturate(1.4) brightness(0.5)',
          }}
        />

        {/* Heavy dark base — text contrast */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(7,2,14,0.75)',
          display: 'flex',
        }} />

        {/* Radial vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 15%, rgba(7,2,14,0.5) 100%)',
          display: 'flex',
        }} />

        {/* Purple crown glow */}
        <div style={{
          position: 'absolute', top: -80, left: '50%',
          transform: 'translateX(-50%)',
          width: 480, height: 300,
          borderRadius: '0 0 50% 50%',
          background: 'radial-gradient(ellipse, rgba(138,99,210,0.5) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Gold base warmth */}
        <div style={{
          position: 'absolute', bottom: -80,
          width: 480, height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.2) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* Outer decorative ring */}
        <div style={{
          position: 'absolute',
          width: 420, height: 420,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.25)',
          display: 'flex',
        }} />

        {/* Inner ring */}
        <div style={{
          position: 'absolute',
          width: 360, height: 360,
          borderRadius: '50%',
          border: '1px solid rgba(138,99,210,0.2)',
          display: 'flex',
        }} />

        {/* Roman arch */}
        <div style={{
          position: 'absolute', top: 56, left: '50%',
          transform: 'translateX(-50%)',
          width: 240, height: 140,
          borderRadius: '0 0 120px 120px',
          border: '2px solid rgba(201,168,76,0.35)',
          borderTop: 'none',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 56, left: '50%',
          transform: 'translateX(-50%)',
          width: 170, height: 100,
          borderRadius: '0 0 85px 85px',
          border: '1px solid rgba(138,99,210,0.22)',
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
            color: 'rgba(201,168,76,0.6)',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
            marginTop: 6,
          }}>
            PROTOCOL
          </div>
        </div>

        {/* Corner ticks */}
        {([
          { top: 32, left: 32, borderTop: '2px solid rgba(201,168,76,0.4)', borderLeft: '2px solid rgba(201,168,76,0.4)' },
          { top: 32, right: 32, borderTop: '2px solid rgba(201,168,76,0.4)', borderRight: '2px solid rgba(201,168,76,0.4)' },
          { bottom: 32, left: 32, borderBottom: '2px solid rgba(201,168,76,0.4)', borderLeft: '2px solid rgba(201,168,76,0.4)' },
          { bottom: 32, right: 32, borderBottom: '2px solid rgba(201,168,76,0.4)', borderRight: '2px solid rgba(201,168,76,0.4)' },
        ]).map((style, i) => (
          <div key={i} style={{ position: 'absolute', width: 20, height: 20, display: 'flex', ...style }} />
        ))}
      </div>
    ),
    { width: 512, height: 512 },
  );
}
