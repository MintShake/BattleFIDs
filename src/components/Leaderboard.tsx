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
  finalSlotPoints?: number;
  protocolPoints: number;
  ownerFid:       number | null;
  chosenTier:     string;
  assignedGroup:  string | null;
  avgTeamScore:   number;
  isLive?:         boolean;
  previewUpdatedAt?: string | null;
  preview?:        Record<SlotType, number>;
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
  editionId?: string;
  editionName?: string;
}

const PAGE_SIZE = 20;

interface EditionLeaderboardEntry {
  rank:       number;
  ownerFid:   number | null;
  cardFid:    number;
  handle:     string | null;
  thumb:      string | null;
  rarity:     string | null;
  value:      number | null;
  slotPoints: number;
}

interface EditionSlotInfo {
  slotKey:     string;
  label:       string;
  emoji:       string;
  description: string;
}

interface NextDraftTeam {
  weekId:     string;
  chosenTier: string;
  slots: Record<SlotType, SlotCard>;
}

function computeNextWeekId(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default function Leaderboard({ ownerFid, editionId = 'base', editionName = 'Base' }: Props) {
  const [group, setGroup]       = useState<Group>('beginner');
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [editionEntries, setEditionEntries] = useState<EditionLeaderboardEntry[]>([]);
  const [editionSlot, setEditionSlot] = useState<EditionSlotInfo | null>(null);
  const [nextDraft, setNextDraft] = useState<NextDraftTeam | null>(null);
  const [totalTeams, setTotal]  = useState(0);
  const [weekId, setWeekId]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const isEditionBoard = editionId !== 'base';

  useEffect(() => {
    if (isEditionBoard) return;
    let cancelled = false;

    async function load(showLoading: boolean) {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch(`/api/week/leaderboard?group=${group}&limit=${PAGE_SIZE}&page=1&live=1`);
        const data = await res.json();
        if (cancelled) return;
        setEntries(data.leaderboard ?? []);
        setTotal(data.totalTeams ?? 0);
        setWeekId(data.weekId ?? '');
        setHasMore(data.hasMore ?? false);
        setLastUpdated(new Date().toISOString());
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    setPage(1);
    load(true);
    const iv = setInterval(() => load(false), 30000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [group, isEditionBoard]);

  useEffect(() => {
    if (isEditionBoard || !ownerFid) {
      setNextDraft(null);
      return;
    }

    const draftWeekId = computeNextWeekId();
    fetch(`/api/week/team?ownerFid=${ownerFid}&weekId=${draftWeekId}`)
      .then(r => r.json())
      .then(data => {
        const t = data.team;
        if (!t) {
          setNextDraft(null);
          return;
        }
        setNextDraft({
          weekId: data.weekId ?? draftWeekId,
          chosenTier: t.chosen_tier ?? 'beginner',
          slots: {
            casts:      { fid: t.casts_fid,      handle: t.casts_handle,      thumb: t.casts_thumb,      rarity: t.casts_rarity },
            replies:    { fid: t.replies_fid,    handle: t.replies_handle,    thumb: t.replies_thumb,    rarity: t.replies_rarity },
            followers:  { fid: t.followers_fid,  handle: t.followers_handle,  thumb: t.followers_thumb,  rarity: t.followers_rarity },
            score_rise: { fid: t.score_rise_fid, handle: t.score_rise_handle, thumb: t.score_rise_thumb, rarity: t.score_rise_rarity },
            likes:      { fid: t.likes_fid,      handle: t.likes_handle,      thumb: t.likes_thumb,      rarity: t.likes_rarity },
          },
        });
      })
      .catch(() => setNextDraft(null));
  }, [ownerFid, isEditionBoard]);

  useEffect(() => {
    if (!isEditionBoard) return;
    setLoading(true);
    fetch(`/api/week/edition-pick?editionId=${encodeURIComponent(editionId)}`)
      .then(r => r.json())
      .then(data => {
        setEditionEntries(data.leaderboard ?? []);
        setEditionSlot(data.slot ?? null);
        setTotal(data.totalPicks ?? 0);
        setWeekId(data.weekId ?? '');
        setHasMore(false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [editionId, isEditionBoard]);

  function loadMore() {
    const next = page + 1;
    fetch(`/api/week/leaderboard?group=${group}&limit=${PAGE_SIZE}&page=${next}&live=1`)
      .then(r => r.json())
      .then(data => {
        setEntries(prev => [...prev, ...(data.leaderboard ?? [])]);
        setHasMore(data.hasMore ?? false);
        setPage(next);
      })
      .catch(() => {});
  }

  const maxPoints = entries[0]?.slotPoints ?? 1;

  if (isEditionBoard) {
    const maxValue = Math.max(1, ...editionEntries.map(e => e.value ?? e.slotPoints ?? 0));
    return (
      <div>
        <div style={{
          borderRadius: 14, padding: '10px 14px', marginBottom: 14,
          background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.25em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>
            {editionName}
          </div>
          <div style={{ fontSize: 12, color: '#e0d4f0', fontWeight: 800 }}>
            {editionSlot ? `${editionSlot.emoji} ${editionSlot.label}` : 'Edition Bonus'}
          </div>
          <div style={{ fontSize: 9, color: '#7a6a90', marginTop: 3, lineHeight: 1.5 }}>
            {weekId || '…'} · {totalTeams} pick{totalTeams !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: '#7a6a90', fontSize: 11, letterSpacing: '0.2em' }}>
            Loading…
          </div>
        ) : editionEntries.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>★</div>
            <p style={{ fontSize: 12, color: '#a08cc0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              No edition picks yet
            </p>
            <p style={{ fontSize: 10, color: '#7a6a90', marginTop: 6 }}>
              Unlocked players can add this edition slot from My Team
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {editionEntries.map((entry, i) => {
              const badge = RANK_BADGE[entry.rank];
              const isYou = ownerFid != null && entry.ownerFid === ownerFid;
              const value = entry.value ?? entry.slotPoints;
              const pct = Math.min(100, value / maxValue * 100);

              return (
                <div key={`${entry.ownerFid ?? 'anon'}-${entry.cardFid}-${i}`} style={{
                  borderRadius: 12, padding: '10px 12px',
                  background: isYou ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.04)',
                  border: isYou ? '1px solid rgba(201,168,76,0.35)' : badge ? `1px solid ${badge.color}40` : '1px solid rgba(201,168,76,0.12)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 28, textAlign: 'center', flexShrink: 0, fontSize: badge ? 13 : 10, fontWeight: 900, color: badge?.color ?? '#7a6a90' }}>
                      {badge?.label ?? `#${entry.rank}`}
                    </div>
                    {entry.thumb ? (
                      <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={entry.thumb} alt={entry.handle ?? 'card'} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,0.08)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#e0d4f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.handle ? `@${entry.handle}` : `FID ${entry.cardFid}`}
                      </div>
                      <div style={{ fontSize: 8, color: '#7a6a90', marginTop: 2 }}>
                        FID {entry.cardFid}{entry.rarity ? ` · ${entry.rarity}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: badge?.color ?? '#C9A84C' }}>
                        {value}
                      </div>
                      <div style={{ fontSize: 8, color: '#7a6a90' }}>metric</div>
                    </div>
                  </div>
                  <div style={{ height: 3, background: 'rgba(201,168,76,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: badge ? `linear-gradient(90deg, ${badge.color}, #C9A84C)` : '#C9A84C', borderRadius: 99 }} />
                  </div>
                  {isYou && (
                    <div style={{ fontSize: 8, color: '#C9A84C', fontWeight: 700, letterSpacing: '0.15em', marginTop: 4 }}>
                      YOUR EDITION SLOT
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

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
          LIVE · {totalTeams} team{totalTeams !== 1 ? 's' : ''} · {group}
        </div>
      </div>

      {nextDraft && (
        <div style={{
          borderRadius: 14, padding: '10px 12px', marginBottom: 14,
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.22)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', color: '#C9A84C', textTransform: 'uppercase' }}>
                Your Next Draft
              </div>
              <div style={{ fontSize: 8, color: '#7a6a90', marginTop: 2 }}>
                {nextDraft.weekId} · waiting to lock
              </div>
            </div>
            <div style={{
              flexShrink: 0,
              fontSize: 7,
              padding: '3px 8px',
              borderRadius: 99,
              color: '#C9A84C',
              border: '1px solid rgba(201,168,76,0.3)',
              background: 'rgba(201,168,76,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 800,
            }}>
              {nextDraft.chosenTier}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
            {SLOT_TYPES.map(slot => {
              const card = nextDraft.slots[slot];
              return (
                <div key={slot} title={`${SLOT_LABELS[slot]}${card?.handle ? `: @${card.handle}` : ''}`} style={{ minWidth: 0 }}>
                  {card?.thumb ? (
                    <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.25)' }}>
                      <Image src={card.thumb} alt={card.handle ?? slot} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                  ) : (
                    <div style={{ aspectRatio: '1', borderRadius: 7, background: 'rgba(201,168,76,0.08)' }} />
                  )}
                  <div style={{ fontSize: 8, color: '#C9A84C', textAlign: 'center', marginTop: 3 }}>
                    {SLOT_EMOJI[slot]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            const preview = entry.preview;

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
                      {entry.slotPoints} <span style={{ fontSize: 9, fontWeight: 400, color: '#7a6a90' }}>live</span>
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

                {preview && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginTop: 7 }}>
                    {SLOT_TYPES.map(slot => (
                      <div key={slot} style={{
                        borderRadius: 6,
                        padding: '4px 2px',
                        background: 'rgba(138,99,210,0.055)',
                        border: '1px solid rgba(138,99,210,0.08)',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 10, lineHeight: 1 }}>{SLOT_EMOJI[slot]}</div>
                        <div style={{ fontSize: 8, color: '#cbb7ea', fontWeight: 800, marginTop: 2 }}>
                          {preview[slot] ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
        {entries.length} of {totalTeams} · live refresh every 30s{lastUpdated ? ` · checked ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''} · final rewards settle when the round ends
      </p>
    </div>
  );
}
