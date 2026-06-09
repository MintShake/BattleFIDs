'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { SLOT_TYPES, SLOT_LABELS, SLOT_EMOJI, type SlotType } from '@/types/league';

const SLOT_COLORS: Record<SlotType, string> = {
  casts:      '#8a63d2',
  replies:    '#3a9bdc',
  followers:  '#22c55e',
  score_rise: '#C9A84C',
  likes:      '#e63946',
};

interface SlotCard {
  fid: number | null; handle: string | null; thumb: string | null; rarity: string | null;
}

interface SlotPreview {
  value: number; beating: number; compared: number;
}

interface TeamState {
  weekId:        string;
  endsAt:        string | null;
  chosenTier:    string;
  assignedGroup: string | null;
  slotPoints:    number;
  rank:          number | null;
  slots:         Record<SlotType, SlotCard>;
  // last saved preview snapshot
  savedPreview: Partial<Record<SlotType, number>> | null;
  savedAt:      string | null;
}

interface PlayerState {
  protocolPoints: number;
  tier:           string;
  lockedToPro:    boolean;
}

interface Props {
  ownerFid?:   number;
  ownerDevice: string;
  onGoToTeam:  () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function countdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function WeekProgress({ ownerFid, ownerDevice, onGoToTeam }: Props) {
  const [team, setTeam]       = useState<TeamState | null>(null);
  const [player, setPlayer]   = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Record<SlotType, SlotPreview> | null>(null);
  const [totalInGroup, setTotalInGroup] = useState(0);
  const [myGroup, setMyGroup] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateErr, setUpdateErr] = useState('');
  const [tick, setTick] = useState(0);

  // countdown ticker
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const param = ownerFid ? `ownerFid=${ownerFid}` : `ownerDeviceId=${ownerDevice}`;
    fetch(`/api/week/team?${param}`)
      .then(r => r.json())
      .then(res => {
        const t = res.team;
        if (t) {
          setTeam({
            weekId:        res.weekId ?? '',
            endsAt:        res.endsAt ?? null,
            chosenTier:    t.chosen_tier ?? 'beginner',
            assignedGroup: t.assigned_group ?? null,
            slotPoints:    Number(t.slot_points ?? 0),
            rank:          t.rank ? Number(t.rank) : null,
            slots: {
              casts:      { fid: t.casts_fid,      handle: t.casts_handle,      thumb: t.casts_thumb,      rarity: t.casts_rarity },
              replies:    { fid: t.replies_fid,    handle: t.replies_handle,    thumb: t.replies_thumb,    rarity: t.replies_rarity },
              followers:  { fid: t.followers_fid,  handle: t.followers_handle,  thumb: t.followers_thumb,  rarity: t.followers_rarity },
              score_rise: { fid: t.score_rise_fid, handle: t.score_rise_handle, thumb: t.score_rise_thumb, rarity: t.score_rise_rarity },
              likes:      { fid: t.likes_fid,      handle: t.likes_handle,      thumb: t.likes_thumb,      rarity: t.likes_rarity },
            },
            savedPreview: t.preview_casts != null ? {
              casts:      Number(t.preview_casts),
              replies:    Number(t.preview_replies),
              followers:  Number(t.preview_followers),
              score_rise: Number(t.preview_score_rise),
              likes:      Number(t.preview_likes),
            } : null,
            savedAt: t.preview_updated_at ?? null,
          });
          if (t.preview_casts != null) {
            setPreview({
              casts:      { value: Number(t.preview_casts),      beating: 0, compared: 0 },
              replies:    { value: Number(t.preview_replies),    beating: 0, compared: 0 },
              followers:  { value: Number(t.preview_followers),  beating: 0, compared: 0 },
              score_rise: { value: Number(t.preview_score_rise), beating: 0, compared: 0 },
              likes:      { value: Number(t.preview_likes),      beating: 0, compared: 0 },
            });
            if (t.preview_updated_at) setUpdatedAt(t.preview_updated_at);
          }
        }
        if (res.player) {
          setPlayer({
            protocolPoints: Number(res.player.protocol_points ?? 0),
            tier:           res.player.tier ?? 'beginner',
            lockedToPro:    Boolean(res.player.locked_to_pro),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ownerFid, ownerDevice]);

  const handleUpdate = useCallback(async () => {
    if (updating) return;
    setUpdating(true);
    setUpdateErr('');
    try {
      const res = await fetch('/api/week/score/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownerFid ? { ownerFid } : { ownerDeviceId: ownerDevice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setPreview(data.slots);
      setMyGroup(data.myGroup);
      setTotalInGroup(data.totalInGroup);
      setUpdatedAt(data.updatedAt);
    } catch (e) {
      setUpdateErr(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  }, [updating, ownerFid, ownerDevice]);

  // ── loading / no team ─────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ textAlign: 'center', paddingTop: 40, color: '#7a6a90', fontSize: 11, letterSpacing: '0.2em' }}>
      Loading…
    </div>
  );

  if (!team) return (
    <div style={{ textAlign: 'center', paddingTop: 50 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 8 }}>
        Next Game
      </div>
      <div style={{ fontSize: 28, marginBottom: 10 }}>⚔</div>
      <p style={{ fontSize: 10, color: '#7a6a90', marginBottom: 24, lineHeight: 1.6 }}>
        No team set for this week.<br />Pick 5 cards and lock in to compete.
      </p>
      <button onClick={onGoToTeam} style={{ padding: '13px 32px', borderRadius: 99, border: '1px solid rgba(138,99,210,0.45)', background: 'rgba(138,99,210,0.12)', color: '#c4a4ff', fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
        Build Team
      </button>
    </div>
  );

  // ── derived state ─────────────────────────────────────────────────────────

  const scored      = team.slotPoints > 0 || team.rank != null;
  const hasPreview  = preview != null;

  const effectiveGroup = team.chosenTier === 'pro'
    ? 'pro'
    : team.chosenTier === 'confident' ? (team.assignedGroup ?? null) : 'beginner';

  let groupLabel = effectiveGroup === 'pro' ? '★ PRO' : effectiveGroup === 'beginner' ? '◎ BEGINNER' : '⚡ PENDING';
  let groupColor = effectiveGroup === 'pro' ? '#C9A84C' : effectiveGroup === 'beginner' ? '#22c55e' : '#a78bfa';

  const slotWins = hasPreview
    ? SLOT_TYPES.filter(s => {
        const p = preview[s];
        return p.compared > 0 && p.beating >= p.compared / 2;
      }).length
    : null;

  const countdown_ = team.endsAt ? countdown(team.endsAt) : null;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', color: '#5a4a70', textTransform: 'uppercase', marginBottom: 4 }}>
            {team.weekId}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', padding: '3px 10px', borderRadius: 99, background: `${groupColor}15`, border: `1px solid ${groupColor}40`, color: groupColor, textTransform: 'uppercase' }}>
              {groupLabel}
            </div>
            {countdown_ && (
              <div style={{ fontSize: 8, color: '#5a4a70', letterSpacing: '0.1em' }}>{countdown_}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {player && (
            <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 700 }}>⬡ {player.protocolPoints.toLocaleString()}</div>
          )}
          {scored && (
            <div style={{ fontSize: 9, color: '#a08cc0', marginTop: 2 }}>
              {team.slotPoints} pts{team.rank ? ` · #${team.rank}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Status banner ── */}
      {hasPreview && slotWins !== null && !scored && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 12,
          background: slotWins >= 3 ? 'rgba(34,197,94,0.08)' : slotWins > 0 ? 'rgba(201,168,76,0.08)' : 'rgba(138,99,210,0.06)',
          border: `1px solid ${slotWins >= 3 ? 'rgba(34,197,94,0.25)' : slotWins > 0 ? 'rgba(201,168,76,0.2)' : 'rgba(138,99,210,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: slotWins >= 3 ? '#22c55e' : slotWins > 0 ? '#C9A84C' : '#7a6a90', lineHeight: 1 }}>
              {slotWins} / 5
            </div>
            <div style={{ fontSize: 8, color: '#7a6a90', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
              slots winning
            </div>
          </div>
          <div style={{ fontSize: slotWins >= 3 ? 22 : 18, opacity: slotWins >= 3 ? 1 : 0.5 }}>
            {slotWins >= 3 ? '🏆' : slotWins > 0 ? '⚔' : '📊'}
          </div>
        </div>
      )}

      {scored && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#C9A84C', lineHeight: 1 }}>{team.slotPoints} pts</div>
            <div style={{ fontSize: 8, color: '#7a6a90', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>final score</div>
          </div>
          {team.rank && <div style={{ fontSize: 22, fontWeight: 900, color: '#8a63d2' }}>#{team.rank}</div>}
        </div>
      )}

      {/* ── Slot rows ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {SLOT_TYPES.map(slot => {
          const card  = team.slots[slot];
          const color = SLOT_COLORS[slot];
          const p     = preview?.[slot] ?? null;

          const winning  = p && p.compared > 0 && p.beating > p.compared / 2;
          const leading  = p && p.compared > 0 && p.beating === p.compared - 1;
          const barPct   = p && p.compared > 1
            ? Math.round((p.beating / (p.compared - 1)) * 100)
            : p ? 100 : 0;

          let statusLabel = '';
          let statusColor = '#5a4a70';
          if (p) {
            if (p.compared === 0) { statusLabel = 'no data yet'; statusColor = '#5a4a70'; }
            else if (leading)     { statusLabel = 'leading';     statusColor = '#22c55e'; }
            else if (winning)     { statusLabel = `#${p.compared - p.beating} of ${p.compared}`; statusColor = '#C9A84C'; }
            else                  { statusLabel = `#${p.compared - p.beating} of ${p.compared}`; statusColor = '#7a6a90'; }
          }

          return (
            <div key={slot} style={{
              borderRadius: 12, overflow: 'hidden',
              background: winning ? `${color}0d` : 'rgba(138,99,210,0.04)',
              border: `1px solid ${winning ? color + '35' : color + '18'}`,
            }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                {/* Slot icon */}
                <div style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>
                  {SLOT_EMOJI[slot]}
                </div>

                {/* Avatar */}
                {card?.thumb ? (
                  <div style={{ position: 'relative', width: 30, height: 30, borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: `1px solid ${color}30` }}>
                    <Image src={card.thumb} alt={card.handle ?? slot} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}15`, flexShrink: 0 }} />
                )}

                {/* Handle + slot name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: card?.handle ? '#e0d4f0' : '#5a4a70', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card?.handle ? `@${card.handle}` : '—'}
                  </div>
                  <div style={{ fontSize: 8, color, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
                    {SLOT_LABELS[slot]}
                  </div>
                </div>

                {/* Value + status */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {p ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{p.value}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: statusColor, letterSpacing: '0.08em', marginTop: 1 }}>
                        {statusLabel}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 9, color: '#5a4a70' }}>—</div>
                  )}
                </div>
              </div>

              {/* Progress bar (only when we have comparison data) */}
              {p && p.compared > 0 && (
                <div style={{ height: 3, background: `${color}18`, margin: '0 12px 10px' }}>
                  <div style={{
                    height: '100%', width: `${barPct}%`,
                    background: leading ? `linear-gradient(90deg, ${color}, #22c55e)` : color,
                    borderRadius: 99, transition: 'width 0.5s ease',
                    minWidth: barPct > 0 ? 6 : 0,
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Update button ── */}
      {!scored && (
        <>
          <button
            onClick={handleUpdate}
            disabled={updating}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, marginBottom: 6,
              border: `1px solid ${updating ? 'rgba(138,99,210,0.15)' : 'rgba(138,99,210,0.4)'}`,
              background: updating ? 'rgba(138,99,210,0.04)' : 'rgba(138,99,210,0.12)',
              color: updating ? '#5a4a70' : '#c4a4ff',
              fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
              cursor: updating ? 'default' : 'pointer', transition: 'all 0.15s',
            }}
          >
            {updating ? 'Checking live stats…' : '↻  Update Live Stats'}
          </button>

          {updateErr && (
            <div style={{ fontSize: 9, color: '#e63946', textAlign: 'center', marginBottom: 6 }}>{updateErr}</div>
          )}

          <div style={{ fontSize: 8, color: '#4a3a60', textAlign: 'center', marginBottom: 12, lineHeight: 1.6 }}>
            {updatedAt ? `Checked ${timeAgo(updatedAt)}` : 'Hit update to check your live standings'}
            {totalInGroup > 0 && ` · ${totalInGroup} teams in ${myGroup ?? effectiveGroup ?? 'your group'}`}
          </div>
        </>
      )}

      {/* ── Edit / next week ── */}
      {scored ? (
        <button onClick={onGoToTeam} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(138,99,210,0.3)', background: 'rgba(138,99,210,0.1)', color: '#c4a4ff', fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Build Next Week's Team
        </button>
      ) : (
        <button onClick={onGoToTeam} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(138,99,210,0.15)', background: 'transparent', color: '#5a4a70', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Edit Team
        </button>
      )}
    </div>
  );
}
