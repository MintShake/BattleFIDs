'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from './WalletConnect';

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
  ownerDeviceId?: string;
  handle?: string;
  playerData?: PlayerData | null;
  onCollectionRefresh?: () => void;
}

export default function ProfileTab({ ownerFid, ownerDeviceId, handle, playerData, onCollectionRefresh }: Props) {
  const wallet = useWallet();
  const [linkStatus, setLinkStatus] = useState<{ linkedFid?: number | null; mode?: string } | null>(null);
  const [linking, setLinking] = useState(false);

  // On mount: check if DB already has a link (handles any-order linking)
  useEffect(() => {
    if (!ownerFid && !ownerDeviceId) return;
    const param = ownerFid ? `ownerFid=${ownerFid}` : `ownerDeviceId=${encodeURIComponent(ownerDeviceId!)}`;
    fetch(`/api/players/link-wallet?${param}`)
      .then(r => r.json())
      .then(data => {
        if (data.linkedFid) {
          setLinkStatus({ linkedFid: data.linkedFid, mode: 'device' });
          onCollectionRefresh?.();
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerFid, ownerDeviceId]);

  // When wallet connects/changes, attempt to link identities
  useEffect(() => {
    if (!wallet.address) return;
    if (!ownerFid && !ownerDeviceId) return;

    setLinking(true);
    fetch('/api/players/link-wallet', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        walletAddress: wallet.address,
        ownerFid: ownerFid ?? undefined,
        ownerDeviceId: ownerDeviceId ?? undefined,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setLinkStatus(data);
        if (data.linkedFid) onCollectionRefresh?.();
      })
      .catch(() => {})
      .finally(() => setLinking(false));
  }, [wallet.address, ownerFid, ownerDeviceId]);

  const tier = playerData?.tier ?? 'beginner';
  const tierColor = tier === 'pro' ? '#C9A84C' : tier === 'confident' ? '#8a63d2' : '#22c55e';
  const tierLabel = tier === 'pro' ? '★ Pro' : tier === 'confident' ? '◈ Confident' : '◎ Beginner';

  const isLinked = linkStatus?.linkedFid != null;
  const isFidMode = !!ownerFid;
  const shortDevice = ownerDeviceId ? `${ownerDeviceId.slice(0, 8)}…` : null;

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

        {isFidMode ? (
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
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'rgba(138,99,210,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🌐</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#f0eaf8' }}>Standalone</div>
              <div style={{ fontSize: 9, color: '#7a6a90', marginTop: 2, fontFamily: 'monospace' }}>Device {shortDevice}</div>
            </div>
            <div style={{
              marginLeft: 'auto', fontSize: 9, padding: '3px 10px', borderRadius: 99,
              fontWeight: 700, color: tierColor,
              background: `${tierColor}18`, border: `1px solid ${tierColor}40`,
            }}>{tierLabel}</div>
          </div>
        )}
      </div>

      {/* Wallet + linking */}
      <div style={{
        borderRadius: 16, padding: '16px',
        background: 'rgba(138,99,210,0.04)',
        border: '1px solid rgba(138,99,210,0.15)',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase', marginBottom: 12 }}>
          Wallet
        </div>

        <WalletConnect />

        {wallet.connected && (
          <div style={{ marginTop: 12 }}>
            {linking ? (
              <div style={{ fontSize: 9, color: '#7a6a90', letterSpacing: '0.1em' }}>Linking identities…</div>
            ) : isLinked ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 10, marginTop: 4,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
              }}>
                <span style={{ color: '#22c55e', fontSize: 14 }}>✓</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}>Identities linked</div>
                  <div style={{ fontSize: 8, color: '#6b7a6b', marginTop: 1 }}>
                    Your standalone cards + FID #{linkStatus?.linkedFid} cards are now merged
                  </div>
                </div>
              </div>
            ) : isFidMode ? (
              <div style={{
                padding: '8px 12px', borderRadius: 10, marginTop: 4,
                background: 'rgba(138,99,210,0.06)', border: '1px solid rgba(138,99,210,0.2)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8a63d2' }}>Wallet saved to your profile</div>
                <div style={{ fontSize: 8, color: '#7a6a90', marginTop: 1 }}>
                  Connect the same wallet from standalone to merge your card collections
                </div>
              </div>
            ) : (
              <div style={{
                padding: '8px 12px', borderRadius: 10, marginTop: 4,
                background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C' }}>No Farcaster account found</div>
                <div style={{ fontSize: 8, color: '#7a6a90', marginTop: 1 }}>
                  Connect the same wallet in Farcaster to link your identities
                </div>
              </div>
            )}
          </div>
        )}

        {!wallet.connected && (
          <div style={{ fontSize: 9, color: '#6b5a80', marginTop: 10, lineHeight: 1.5 }}>
            {isFidMode
              ? 'Connect your wallet to link to standalone. Open packs from either — cards appear in both places.'
              : 'Connect your wallet to link this device to your Farcaster identity and merge card collections.'}
          </div>
        )}
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
