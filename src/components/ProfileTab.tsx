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

interface StoredWallet {
  address: string;
  linkedFid: number | null;
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
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>([]);
  const [linkedFid, setLinkedFid] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const identityParam = ownerFid
    ? `ownerFid=${ownerFid}`
    : `ownerDeviceId=${encodeURIComponent(ownerDeviceId ?? '')}`;

  function fetchWallets() {
    if (!ownerFid && !ownerDeviceId) return;
    fetch(`/api/players/wallets?${identityParam}`)
      .then(r => r.json())
      .then(data => {
        setStoredWallets(data.wallets ?? []);
        if (data.linkedFid) {
          setLinkedFid(data.linkedFid);
          onCollectionRefresh?.();
        }
      })
      .catch(() => {});
  }

  // On mount: load existing wallets from DB
  useEffect(() => {
    fetchWallets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerFid, ownerDeviceId]);

  // When wallet connects or FID resolves, add it
  useEffect(() => {
    if (!wallet.address) return;
    if (!ownerFid && !ownerDeviceId) return;

    // Skip if this wallet is already in the list
    const already = storedWallets.some(w => w.address === wallet.address);
    if (already) return;

    setLinking(true);
    fetch('/api/players/wallets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        walletAddress: wallet.address,
        ownerFid:      ownerFid ?? undefined,
        ownerDeviceId: ownerDeviceId ?? undefined,
        resolvedFid:   wallet.fid ?? undefined,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.linkedFid) {
          setLinkedFid(data.linkedFid);
          onCollectionRefresh?.();
        }
        fetchWallets();
      })
      .catch(() => {})
      .finally(() => setLinking(false));
  // wallet.fid included so this re-fires when Neynar lookup resolves with a new FID
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.address, wallet.fid]);

  function removeWallet(address: string) {
    setRemoving(address);
    fetch(`/api/players/wallets?wallet=${encodeURIComponent(address)}&${identityParam}`, { method: 'DELETE' })
      .then(() => {
        if (wallet.address === address) wallet.disconnect();
        fetchWallets();
      })
      .catch(() => {})
      .finally(() => setRemoving(null));
  }

  const tier = playerData?.tier ?? 'beginner';
  const tierColor = tier === 'pro' ? '#C9A84C' : tier === 'confident' ? '#8a63d2' : '#22c55e';
  const tierLabel = tier === 'pro' ? '★ Pro' : tier === 'confident' ? '◈ Confident' : '◎ Beginner';
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

        {/* Linked Farcaster identity badge (device mode) */}
        {!isFidMode && linkedFid && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 10, padding: '6px 10px', borderRadius: 8,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          }}>
            <span style={{ color: '#22c55e', fontSize: 12 }}>✓</span>
            <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>
              Linked to Farcaster FID #{linkedFid}
            </div>
          </div>
        )}
      </div>

      {/* Wallets */}
      <div style={{
        borderRadius: 16, padding: '16px',
        background: 'rgba(138,99,210,0.04)',
        border: '1px solid rgba(138,99,210,0.15)',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase', marginBottom: 12 }}>
          Wallets
        </div>

        {/* List of stored wallets */}
        {storedWallets.length > 0 && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {storedWallets.map(w => (
              <div key={w.address} style={{
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 99,
                  border: '1px solid rgba(201,168,76,0.35)',
                  background: 'rgba(201,168,76,0.06)',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.05em', flex: 1 }}>
                    {`${w.address.slice(0, 6)}…${w.address.slice(-4)}`}
                  </span>
                  {w.linkedFid && (
                    <span style={{ fontSize: 8, color: '#22c55e', fontWeight: 700 }}>
                      FID #{w.linkedFid}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeWallet(w.address)}
                  disabled={removing === w.address}
                  style={{
                    padding: '7px 12px', borderRadius: 99, flexShrink: 0,
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'transparent', color: '#ef4444',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                    cursor: removing === w.address ? 'default' : 'pointer',
                    opacity: removing === w.address ? 0.5 : 1,
                  }}
                >
                  {removing === w.address ? '…' : 'REMOVE'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add wallet */}
        {linking ? (
          <div style={{ fontSize: 9, color: '#7a6a90', letterSpacing: '0.1em' }}>Linking…</div>
        ) : (
          <div>
            <WalletConnect />
            <div style={{ fontSize: 9, color: '#6b5a80', marginTop: 10, lineHeight: 1.5 }}>
              {storedWallets.length > 0
                ? 'Connect another wallet to add it to your profile.'
                : isFidMode
                  ? 'Connect a wallet to link to standalone. Cards from either appear together.'
                  : 'Connect a wallet to merge with your Farcaster identity.'}
            </div>
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
