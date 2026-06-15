'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { SLOT_TYPES, SLOT_EMOJI, SLOT_LABELS, type SlotType } from '@/types/league';

interface SlotCard {
  fid:    number | null;
  handle: string | null;
  thumb:  string | null;
  rarity?: string | null;
}

interface LeaderboardEntry {
  rank:           number;
  slotPoints:     number;
  protocolPoints: number;
  ownerFid:       number | null;
  chosenTier:     string;
  assignedGroup:  string | null;
  avgTeamScore:   number;
  slots: Record<SlotType, SlotCard>;
}

type Group = 'beginner' | 'pro';

const RANK_BADGE: Record<number, { color: string; label: string }> = {
  1: { color: '#C9A84C', label: '1st' },
  2: { color: '#a8a8a8', label: '2nd' },
  3: { color: '#cd7f32', label: '3rd' },
};

interface Props {
  ownerFid?: number;
}

const PAGE_SIZE = 20;

export default function Leaderboard({ ownerFid }: Props) {
  const [group, setGroup]       = useState<Group>('beginner');
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [totalTeams, setTotal]  = useState(0);
  const [weekId, setWeekId]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetch(`/api/week/leaderboard?group=${group}&limit=${PAGE_SIZE}&page=1`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.leaderboard ?? []);
        setTotal(data.totalTeams ?? 0);
        setWeekId(data.weekId ?? '');
        setHasMore(data.hasMore ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [group]);

  function loadMore() {
    const next = page + 1;
    fetch(`/api/week/leaderboard?group=${group}&limit=${PAGE_SIZE}&page=${next}`)
      .then(r => r.json())
      .then(data => {
        setEntries(prev => [...prev, ...(data.leaderboard ?? [])]);
        setHasMore(data.hasMore ?? false);
        setPage(next);
      })
      .catch(() => {});
  }

  const maxPoints = entries[0]?.slotPoints ?? 1;

  return (
    <div>
      {/* Group tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
        {(['beginner', 'pro'] as Group[]).map(g => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            style={{
              padding: '6px 18px', borderRadius: 99,
              border: group === g
                ? `1px solid ${g === 'pro' ? '#C9A84C' : '#22c55e'}`
                : '1px solid rgba(138,99,210,0.2)',
              background: group === g
                ? (g === 'pro' ? 'rgba(201,168,76,0.1)' : 'rgba(34,197,94,0.08)')
                : 'transparent',
              color: group === g
                ? (g === 'pro' ? '#C9A84C' : '#22c55e')
                : '#7a6a90',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {g === 'pro' ? '★ Pro' : '◎ Beginner'}
          </button>
        ))}
      </div>

      {/* Week header */}
      <div style={{
        borderRadius: 14, padding: '10px 14px', marginBottom: 14,
        background: 'rgba(138,99,210,0.05)', border: '1px solid rgba(138,99,210,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: '#a08cc0', textTransform: 'uppercase' }}>
          {weekId || '…'}
        </div>
        <div style={{ fontSize: 10, color: '#7a6a90' }}>
          {totalTeams} team{totalTeams !== 1 ? 's' : ''} · {group}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40, color: '#7a6a90', fontSize: 11, letterSpacing: '0.2em' }}>
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
          <p style={{ fontSize: 12, color: '#a08cc0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            No teams in {group}
          </p>
          <p style={{ fontSize: 10, color: '#7a6a90', marginTop: 6 }}>
            Lock in a team to appear here
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, i) => {
            const badge  = RANK_BADGE[entry.rank];
            const isYou  = ownerFid != null && entry.ownerFid === ownerFid;
            const pct    = Math.min(100, entry.slotPoints / Math.max(maxPoints, 1) * 100);

            return (
              <div
                key={i}
                style={{
                  borderRadius: 12, padding: '10px 12px',
                  background: isYou ? 'rgba(138,99,210,0.12)' : 'rgba(138,99,210,0.04)',
                  border: isYou
                    ? '1px solid rgba(138,99,210,0.35)'
                    : badge ? `1px solid ${badge.color}40` : '1px solid rgba(138,99,210,0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  {/* Rank */}
                  <div style={{
                    width: 28, textAlign: 'center', flexShrink: 0,
                    fontSize: badge ? 13 : 10, fontWeight: 900,
                    color: badge?.color ?? '#7a6a90',
                  }}>
                    {badge?.label ?? `#${entry.rank}`}
                  </div>

                  {/* Slot thumbnail strip */}
                  <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'wrap' }}>
                    {SLOT_TYPES.map(slot => {
                      const card = entry.slots[slot];
                      return card?.thumb ? (
                        <div
                          key={slot}
                          title={`${SLOT_EMOJI[slot]} ${SLOT_LABELS[slot]}: @${card.handle}`}
                          style={{ position: 'relative', width: 24, height: 24, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}
                        >
                          <Image src={card.thumb} alt={card.handle ?? slot} fill style={{ objectFit: 'cover' }} unoptimized />
                        </div>
                      ) : (
                        <div key={slot} style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(138,99,210,0.08)', flexShrink: 0 }} />
                      );
                    })}
                  </div>

                  {/* Slot points + protocol points */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: badge?.color ?? '#8a63d2' }}>
                      {entry.slotPoints} <span style={{ fontSize: 9, fontWeight: 400, color: '#7a6a90' }}>pts</span>
                    </div>
                    <div style={{ fontSize: 8, color: '#C9A84C' }}>
                      ⬡ {entry.protocolPoints.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Score bar */}
                <div style={{ height: 3, background: 'rgba(138,99,210,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: badge ? `linear-gradient(90deg, ${badge.color}, #8a63d2)` : '#8a63d2',
                    borderRadius: 99, transition: 'width 0.4s ease',
                  }} />
                </div>

                {isYou && (
                  <div style={{ fontSize: 8, color: '#8a63d2', fontWeight: 700, letterSpacing: '0.15em', marginTop: 4 }}>
                    YOUR TEAM
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          style={{
            display: 'block', width: '100%', marginTop: 12,
            padding: '10px', borderRadius: 99,
            border: '1px solid rgba(138,99,210,0.25)',
            background: 'transparent', color: '#a08cc0',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          Load More
        </button>
      )}

      <p style={{ fontSize: 9, color: '#5a4a70', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
        {entries.length} of {totalTeams} · Pts: 1/beat per slot · +50 overall win · +25 rare card (FID ≤100) · +20 entry · updated end of week
      </p>
    </div>
  );
}
