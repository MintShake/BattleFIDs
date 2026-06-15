'use client';

import { useEffect, useState } from 'react';

interface SpinOutcome {
  label: string;
  points: number;
  weight?: number;
}

interface TodaySpin {
  points: number;
  label: string;
  spunAt: string;
}

interface Props {
  ownerFid?: number;
  onPointsUpdated?: (protocolPoints: number) => void;
}

export default function DailySpinModal({ ownerFid, onPointsUpdated }: Props) {
  const [checking, setChecking] = useState(true);
  const [visible, setVisible] = useState(false);
  const [available, setAvailable] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<SpinOutcome | null>(null);
  const [odds, setOdds] = useState<SpinOutcome[]>([]);
  const [today, setToday] = useState<TodaySpin | null>(null);

  useEffect(() => {
    if (!ownerFid) {
      setChecking(false);
      return;
    }

    fetch(`/api/spin/daily?ownerFid=${ownerFid}`)
      .then(r => r.json())
      .then(data => {
        setOdds(data.odds ?? []);
        setAvailable(Boolean(data.available));
        setToday(data.today ?? null);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [ownerFid]);

  async function spin() {
    if (!ownerFid || spinning) return;
    setSpinning(true);
    try {
      const res = await fetch('/api/spin/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerFid }),
      });
      const data = await res.json();
      if (data.outcome) setOutcome(data.outcome);
      if (typeof data.protocolPoints === 'number') onPointsUpdated?.(data.protocolPoints);
      setAvailable(false);
      setToday(data.outcome ? { points: data.outcome.points, label: data.outcome.label, spunAt: new Date().toISOString() } : null);
    } finally {
      setSpinning(false);
    }
  }

  if (checking || !ownerFid) return null;

  const totalWeight = odds.reduce((s, o) => s + (o.weight ?? 0), 0);

  return (
    <>
    <button
      onClick={() => setVisible(true)}
      aria-label={available ? 'Daily spin available' : 'Daily spin'}
      title={available ? 'Daily spin available' : 'Daily spin'}
      style={{
        position: 'fixed',
        right: 14,
        bottom: 78,
        zIndex: 220,
        width: 46,
        height: 46,
        borderRadius: '50%',
        border: available ? '1px solid rgba(201,168,76,0.68)' : '1px solid rgba(138,99,210,0.28)',
        background: available
          ? 'conic-gradient(from 20deg, #8a63d2, #C9A84C, #22c55e, #8a63d2)'
          : 'rgba(14,8,24,0.92)',
        color: '#fff',
        boxShadow: available ? '0 0 22px rgba(201,168,76,0.42)' : '0 0 16px rgba(0,0,0,0.34)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <span style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: '#09040f',
        display: 'grid',
        placeItems: 'center',
        color: available ? '#C9A84C' : '#a08cc0',
        fontSize: 20,
        fontWeight: 900,
      }}>
        ⬡
      </span>
      {available && (
        <span style={{
          position: 'absolute',
          top: -3,
          right: -2,
          minWidth: 15,
          height: 15,
          borderRadius: 99,
          background: '#22c55e',
          color: '#03130a',
          border: '1px solid rgba(255,255,255,0.76)',
          fontSize: 9,
          lineHeight: '15px',
          fontWeight: 900,
        }}>
          1
        </span>
      )}
    </button>

    {visible && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(5,1,12,0.82)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 18,
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        borderRadius: 18, padding: 2,
        background: 'linear-gradient(135deg, #8a63d2, #C9A84C)',
        boxShadow: '0 0 40px rgba(138,99,210,0.35)',
      }}>
        <div style={{ borderRadius: 16, background: '#09040f', padding: '18px 16px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.32em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 8 }}>
            Daily Protocol Spin
          </div>

          <div style={{
            width: 118, height: 118, borderRadius: '50%', margin: '0 auto 14px',
            background: outcome
              ? outcome.points > 0 ? 'radial-gradient(circle, rgba(201,168,76,0.35), rgba(138,99,210,0.15))' : 'rgba(138,99,210,0.08)'
              : 'conic-gradient(from 20deg, #8a63d2, #C9A84C, #22c55e, #8a63d2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.16)',
            transition: 'transform 0.35s ease',
            transform: spinning ? 'rotate(180deg) scale(1.04)' : 'none',
          }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: '#09040f',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: outcome ? (outcome.points > 0 ? '#C9A84C' : '#7a6a90') : '#f0eaf8',
              fontSize: outcome ? 22 : 28, fontWeight: 900,
            }}>
              {outcome ? (outcome.points > 0 ? `+${outcome.points}` : '0') : '⬡'}
            </div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 900, color: '#f0eaf8', marginBottom: 6 }}>
            {outcome ? outcome.label : available ? 'Spin for points' : 'Spin claimed'}
          </div>
          <div style={{ fontSize: 10, color: '#7a6a90', lineHeight: 1.6, marginBottom: 14 }}>
            {available
              ? 'One free spin per day. Rewards are Protocol Points only.'
              : today
                ? `Today: ${today.label}. Come back tomorrow for another free spin.`
                : 'Come back tomorrow for another free spin.'}
          </div>

          {!outcome && available && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
              {odds.map(o => (
                <span key={o.label} style={{
                  fontSize: 7, color: '#a08cc0', padding: '2px 6px', borderRadius: 99,
                  background: 'rgba(138,99,210,0.08)', border: '1px solid rgba(138,99,210,0.16)',
                }}>
                  {o.label} {totalWeight > 0 && o.weight ? `${Math.round(o.weight / totalWeight * 100)}%` : ''}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={outcome || !available ? () => setVisible(false) : spin}
            disabled={spinning}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: outcome || !available ? 'rgba(138,99,210,0.14)' : 'linear-gradient(135deg, #8a63d2, #C9A84C)',
              color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.16em',
              textTransform: 'uppercase', cursor: spinning ? 'default' : 'pointer',
              opacity: spinning ? 0.65 : 1,
            }}
          >
            {spinning ? 'Spinning...' : outcome || !available ? 'Close' : 'Spin Free'}
          </button>

          {!outcome && available && (
            <button
              onClick={() => setVisible(false)}
              style={{
                marginTop: 8, background: 'none', border: 'none',
                color: '#5a4a70', fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
    )}
    </>
  );
}
