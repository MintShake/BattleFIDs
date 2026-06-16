'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PlayerData {
  protocolPoints: number;
  totalWins: number;
  totalLosses: number;
  referralCode: string;
}

interface Props {
  ownerFid?: number;
  handle?: string;
  playerData?: PlayerData | null;
}

// ── PFP opt-out sub-section ───────────────────────────────────────────────────

function PfpOptOut({ fid }: { fid: number }) {
  const [pfpUrls, setPfpUrls]       = useState<string[]>([]);
  const [optedOut, setOptedOut]     = useState<Set<string>>(new Set());
  const [acting, setActing]         = useState<string | null>(null);
  const [loaded, setLoaded]         = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/profile/${fid}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/opt-out/pfp?fid=${fid}`).then(r => r.ok ? r.json() : { optedOut: [] }),
    ]).then(([profile, optOut]) => {
      const urls: string[] = profile?.cards?.[0]?.pfp_urls ?? [];
      setPfpUrls(urls);
      setOptedOut(new Set(optOut.optedOut as string[]));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [fid]);

  async function toggleOptOut(url: string) {
    if (acting) return;
    setActing(url);
    const isOut = optedOut.has(url);
    try {
      await fetch('/api/opt-out/pfp', {
        method: isOut ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, imageUrl: url }),
      });
      setOptedOut(prev => {
        const next = new Set(prev);
        isOut ? next.delete(url) : next.add(url);
        return next;
      });
    } catch {
      // best-effort
    } finally {
      setActing(null);
    }
  }

  if (!loaded) return (
    <div style={{ fontSize: 9, color: '#6b5a80', padding: '12px 0', letterSpacing: '0.1em' }}>
      Loading your card…
    </div>
  );

  if (pfpUrls.length === 0) return (
    <div style={{ fontSize: 9, color: '#6b5a80', padding: '12px 0', lineHeight: 1.6 }}>
      No card found for your FID yet — one will appear after someone opens a pack containing you.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pfpUrls.map((url, i) => {
        const isOut = optedOut.has(url);
        const isActing = acting === url;
        return (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
              border: isOut ? '2px solid rgba(230,57,70,0.3)' : '2px solid rgba(138,99,210,0.2)',
              opacity: isOut ? 0.45 : 1,
            }}>
              <Image src={url} alt={`pfp-${i}`} width={48} height={48}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8, color: '#7a6a90', marginBottom: 5 }}>
                {i === 0 ? 'Current photo' : `Photo ${pfpUrls.length - i} of ${pfpUrls.length}`}
                {isOut && <span style={{ color: '#e86a6a', marginLeft: 6, fontWeight: 700 }}>· Hidden</span>}
              </div>
              <button
                onClick={() => toggleOptOut(url)}
                disabled={isActing}
                style={{
                  padding: '3px 9px', borderRadius: 99, fontSize: 8, fontWeight: 700,
                  cursor: isActing ? 'default' : 'pointer',
                  opacity: isActing ? 0.5 : 1,
                  border: isOut
                    ? '1px solid rgba(138,99,210,0.3)'
                    : '1px solid rgba(230,57,70,0.3)',
                  background: isOut
                    ? 'rgba(138,99,210,0.06)'
                    : 'rgba(230,57,70,0.06)',
                  color: isOut ? '#8a63d2' : '#c46060',
                }}
              >
                {isActing ? '…' : isOut ? 'Restore' : 'Hide from cards'}
              </button>
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 8, color: '#3a2a4a', lineHeight: 1.6, margin: '4px 0 0' }}>
        Hidden photos are removed from your card&apos;s display immediately. You can restore them at any time.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfileTab({ ownerFid, handle, playerData }: Props) {
  const points = playerData?.protocolPoints ?? 0;

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
            fontWeight: 700, color: '#C9A84C',
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.34)',
          }}>⬡ {points.toLocaleString()}</div>
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

      {/* PFP opt-out */}
      {ownerFid && (
        <div style={{
          borderRadius: 16, padding: '16px',
          background: 'rgba(138,99,210,0.04)',
          border: '1px solid rgba(138,99,210,0.15)',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase', marginBottom: 4 }}>
            Your Card · Photo Control
          </div>
          <p style={{ fontSize: 8, color: '#504060', lineHeight: 1.6, margin: '0 0 12px' }}>
            Your Farcaster profile photos may appear on your BattleFID card. You can hide any photo from appearing on cards at any time.
          </p>
          <PfpOptOut fid={ownerFid} />
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
            Earn 100 Protocol Points when a referred player opens their first pack
          </div>
        </div>
      )}
    </div>
  );
}
