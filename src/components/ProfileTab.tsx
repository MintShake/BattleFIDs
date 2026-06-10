'use client';

interface PlayerData {
  protocolPoints: number;
  tier: string;
  lockedToPro: boolean;
  totalWins: number;
  totalLosses: number;
  referralCode: string;
}

interface Props {
  ownerFid?: number;
  handle?: string;
  playerData?: PlayerData | null;
}

export default function ProfileTab({ ownerFid, handle, playerData }: Props) {
  const tier = playerData?.tier ?? 'beginner';
  const tierColor = tier === 'pro' ? '#C9A84C' : tier === 'confident' ? '#8a63d2' : '#22c55e';
  const tierLabel = tier === 'pro' ? '★ Pro' : tier === 'confident' ? '◈ Confident' : '◎ Beginner';

  return (
    <div style={{ padding: '4px 0 40px' }}>

      {/* Identity card */}
      <div style={{
        borderRadius: 16, padding: '16px',
        background: 'rgba(138,99,210,0.06)',
        border: '1px solid rgba(138,99,210,0.18)',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase', marginBottom: 10 }}>
          Identity
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'rgba(138,99,210,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>⬡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#f0eaf8' }}>
              {handle ? `@${handle}` : `FID #${ownerFid}`}
            </div>
            <div style={{ fontSize: 9, color: '#7a6a90', marginTop: 2 }}>Farcaster · FID #{ownerFid}</div>
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: 9, padding: '3px 10px', borderRadius: 99,
            fontWeight: 700, color: tierColor,
            background: `${tierColor}18`, border: `1px solid ${tierColor}40`,
          }}>{tierLabel}</div>
        </div>
      </div>

      {/* Stats */}
      {playerData && (
        <div style={{
          borderRadius: 16, padding: '16px',
          background: 'rgba(138,99,210,0.04)',
          border: '1px solid rgba(138,99,210,0.15)',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase', marginBottom: 12 }}>
            Stats
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { label: 'Protocol Points', value: playerData.protocolPoints.toLocaleString(), accent: '#C9A84C', prefix: '⬡ ' },
              { label: 'Wins', value: String(playerData.totalWins), accent: '#22c55e', prefix: '' },
              { label: 'Losses', value: String(playerData.totalLosses), accent: '#ef4444', prefix: '' },
            ].map(({ label, value, accent, prefix }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: accent }}>{prefix}{value}</div>
                <div style={{ fontSize: 7, fontWeight: 700, color: '#6b5a80', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral */}
      {playerData?.referralCode && (
        <div style={{
          borderRadius: 16, padding: '14px 16px',
          background: 'rgba(138,99,210,0.04)',
          border: '1px solid rgba(138,99,210,0.15)',
        }}>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase', marginBottom: 8 }}>
            Referral Code
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#8a63d2',
              letterSpacing: '0.2em',
            }}>
              {playerData.referralCode}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(playerData.referralCode).catch(() => {})}
              style={{
                fontSize: 8, padding: '4px 10px', borderRadius: 99,
                border: '1px solid rgba(138,99,210,0.3)',
                background: 'transparent', color: '#8a63d2',
                fontWeight: 700, letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              COPY
            </button>
          </div>
          <div style={{ fontSize: 8, color: '#6b5a80', marginTop: 6 }}>
            Share to earn 100 Protocol Points when someone joins
          </div>
        </div>
      )}
    </div>
  );
}
