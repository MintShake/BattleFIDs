'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { currentWeekId } from '@/lib/weeklyScoring';
import { MAX_TEAM_SCORE } from '@/lib/weeklyScoring';

interface LeaderboardEntry {
  rank:       number;
  totalScore: number;
  ownerFid:   number | null;
  slots: {
    captain:     { handle: string; thumb: string; rarity: string };
    broadcaster: { handle: string; thumb: string };
    publisher:   { handle: string; thumb: string };
    agitator:    { handle: string; thumb: string };
    networker:   { handle: string; thumb: string };
  };
}

const RANK_STYLE: Record<number, { color: string; label: string }> = {
  1: { color: '#C9A84C', label: '1st' },
  2: { color: '#a8a8a8', label: '2nd' },
  3: { color: '#cd7f32', label: '3rd' },
};

interface Props {
  ownerFid?: number;
  totalWageredUsdc: number;  // sum of all wagers this week
  XP_PER_USDC?: number;      // default 100
}

export default function Leaderboard({ ownerFid, totalWageredUsdc, XP_PER_USDC = 100 }: Props) {
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [totalTeams, setTotal]    = useState(0);
  const [weekId, setWeekId]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setWeekId(currentWeekId());
    fetch('/api/week/leaderboard?limit=50')
      .then(r => r.json())
      .then(data => {
        setEntries(data.leaderboard ?? []);
        setTotal(data.totalTeams ?? 0);
        setWeekId(data.weekId ?? '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Xplora credit pool: wagers × XP_PER_USDC, split top 3 by score
  const creditPool = totalWageredUsdc * XP_PER_USDC;
  const top3       = entries.slice(0, 3);
  const top3Total  = top3.reduce((s, e) => s + e.totalScore, 0);

  function creditsFor(score: number): string {
    if (!top3Total || !creditPool) return '25 XP'; // free consolation
    return `${Math.round((score / top3Total) * creditPool)} XP`;
  }

  if (loading) return (
    <div style={{ textAlign: 'center', paddingTop: 40, color: '#7a6a90', fontSize: 11, letterSpacing: '0.2em' }}>Loading…</div>
  );

  if (entries.length === 0) return (
    <div style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
      <p style={{ fontSize: 12, color: '#a08cc0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No teams yet</p>
      <p style={{ fontSize: 10, color: '#7a6a90', marginTop: 6 }}>Be the first to lock in a team this week</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{
        borderRadius: 14, padding: '12px 16px', marginBottom: 14,
        background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: '#5c4030', textTransform: 'uppercase' }}>{weekId}</div>
          <div style={{ fontSize: 11, color: '#8a7550', marginTop: 2 }}>{totalTeams} team{totalTeams !== 1 ? 's' : ''} competing</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: '#3a9bdc', textTransform: 'uppercase' }}>XP Pool</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#3a9bdc' }}>
            {creditPool > 0 ? `${creditPool.toLocaleString()} XP` : 'Free week'}
          </div>
          {totalWageredUsdc > 0 && (
            <div style={{ fontSize: 8, color: '#3a7ba0' }}>${totalWageredUsdc} staked</div>
          )}
        </div>
      </div>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map((entry, i) => {
          const rankStyle = RANK_STYLE[entry.rank];
          const isYou     = ownerFid && entry.ownerFid === ownerFid;
          const pct       = Math.min(100, (entry.totalScore / MAX_TEAM_SCORE) * 100);
          const isTop3    = entry.rank <= 3;

          return (
            <div
              key={i}
              style={{
                borderRadius: 12, padding: '10px 12px',
                background: isYou ? 'rgba(138,99,210,0.12)' : 'rgba(138,99,210,0.04)',
                border: isYou
                  ? '1px solid rgba(138,99,210,0.35)'
                  : isTop3 ? `1px solid ${rankStyle?.color ?? '#C9A84C'}40` : '1px solid rgba(138,99,210,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                {/* Rank */}
                <div style={{
                  width: 28, textAlign: 'center', flexShrink: 0,
                  fontSize: isTop3 ? 13 : 10, fontWeight: 900,
                  color: rankStyle?.color ?? '#7a6a90',
                }}>
                  {rankStyle?.label ?? `#${entry.rank}`}
                </div>

                {/* Thumbnail strip */}
                <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                  {[entry.slots.captain, entry.slots.broadcaster, entry.slots.publisher, entry.slots.agitator, entry.slots.networker].map((slot, si) => (
                    slot?.thumb ? (
                      <div key={si} style={{ position: 'relative', width: 24, height: 24, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={slot.thumb} alt={slot.handle ?? ''} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                    ) : (
                      <div key={si} style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(138,99,210,0.08)', flexShrink: 0 }} />
                    )
                  ))}
                </div>

                {/* Score + prize */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: rankStyle?.color ?? '#8a63d2' }}>
                    {entry.totalScore}
                  </div>
                  {isTop3 && (
                    <div style={{ fontSize: 9, color: '#3a9bdc', fontWeight: 700 }}>
                      {creditsFor(entry.totalScore)}
                    </div>
                  )}
                </div>
              </div>

              {/* Score bar */}
              <div style={{ height: 3, background: 'rgba(138,99,210,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: rankStyle ? `linear-gradient(90deg, ${rankStyle.color}, #8a63d2)` : '#8a63d2',
                  borderRadius: 99,
                }} />
              </div>

              {isYou && (
                <div style={{ fontSize: 8, color: '#8a63d2', fontWeight: 700, letterSpacing: '0.15em', marginTop: 4 }}>YOUR TEAM</div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 9, color: '#7a6a90', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
        Free entry — top 3 free players earn 25 XP each
        {creditPool > 0 && ` · Staked: top 3 split ${creditPool.toLocaleString()} XP by score`}
      </p>
    </div>
  );
}
