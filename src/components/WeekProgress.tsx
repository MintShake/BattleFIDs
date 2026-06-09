'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { SLOT_TYPES, SLOT_LABELS, SLOT_EMOJI, SLOT_DESC, type SlotType } from '@/types/league';

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
  value:    number;
  beating:  number;
  compared: number;
}

interface TeamData {
  weekId:        string;
  chosenTier:    string;
  assignedGroup: string | null;
  slotPoints:    number;
  rank:          number | null;
  slots:         Record<SlotType, SlotCard>;
}

interface PlayerData {
  protocolPoints: number;
  tier:           string;
  lockedToPro:    boolean;
}

interface Props {
  ownerFid?:   number;
  ownerDevice: string;
  onGoToTeam:  () => void;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)  return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function WeekProgress({ ownerFid, ownerDevice, onGoToTeam }: Props) {
  const [team, setTeam]         = useState<TeamData | null>(null);
  const [player, setPlayer]     = useState<PlayerData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [preview, setPreview]   = useState<Record<SlotType, SlotPreview> | null>(null);
  const [myGroup, setMyGroup]   = useState<string | null>(null);
  const [totalInGroup, setTotalInGroup] = useState<number>(0);
  const [updatedAt, setUpdatedAt]       = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    const param = ownerFid ? `ownerFid=${ownerFid}` : `ownerDeviceId=${ownerDevice}`;
    fetch(`/api/week/team?${param}`)
      .then(r => r.json())
      .then(res => {
        const t = res.team;
        if (t) {
          setTeam({
            weekId:        res.weekId ?? '',
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
          });
          // Restore any previously-saved preview values from the team row
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
        const p = res.player;
        if (p) {
          setPlayer({
            protocolPoints: Number(p.protocol_points ?? 0),
            tier:           p.tier ?? 'beginner',
            lockedToPro:    Boolean(p.locked_to_pro),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ownerFid, ownerDevice]);

  async function handleUpdate() {
    if (updating) return;
    setUpdating(true);
    setUpdateError('');
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
      setUpdateError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', paddingTop: 40, color: '#7a6a90', fontSize: 11, letterSpacing: '0.2em' }}>Loading…</div>
  );

  if (!team) return (
    <div style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚔</div>
      <p style={{ fontSize: 12, color: '#a08cc0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No team this week</p>
      <p style={{ fontSize: 10, color: '#7a6a90', marginTop: 6, marginBottom: 20 }}>Pick 5 cards, lock in, and compete</p>
      <button onClick={onGoToTeam} style={{ padding: '12px 28px', borderRadius: 99, border: '1px solid rgba(138,99,210,0.4)', background: 'rgba(138,99,210,0.12)', color: '#8a63d2', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
        Build Team
      </button>
    </div>
  );

  const scored = team.slotPoints > 0 || team.rank != null;

  let groupLabel = team.chosenTier === 'pro' ? '★ Pro' : '◎ Beginner';
  let groupColor = team.chosenTier === 'pro' ? '#C9A84C' : '#22c55e';
  if (team.chosenTier === 'confident') {
    if (team.assignedGroup) {
      groupLabel = team.assignedGroup === 'pro' ? '★ Pro (Confident)' : '◎ Beginner (Confident)';
      groupColor = team.assignedGroup === 'pro' ? '#C9A84C' : '#22c55e';
    } else {
      groupLabel = '⚡ Confident — pending';
      groupColor = '#a78bfa';
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 14, background: 'linear-gradient(135deg, rgba(138,99,210,0.1), rgba(201,168,76,0.06))', border: '1px solid rgba(138,99,210,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 4 }}>
            {team.weekId}
          </div>
          <div style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', background: `${groupColor}15`, border: `1px solid ${groupColor}40`, color: groupColor }}>
            {groupLabel}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {scored ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#C9A84C', lineHeight: 1.1 }}>{team.slotPoints}</div>
              <div style={{ fontSize: 9, color: '#a08cc0' }}>slot pts{team.rank ? ` · #${team.rank}` : ''}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#8a63d2' }}>Locked in</div>
              <div style={{ fontSize: 9, color: '#7a6a90', marginTop: 2 }}>scored Sun 23:00 UTC</div>
            </>
          )}
          {player && (
            <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 700, marginTop: 4 }}>
              ⬡ {player.protocolPoints.toLocaleString()} pts
            </div>
          )}
        </div>
      </div>

      {/* Per-slot breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {SLOT_TYPES.map(slot => {
          const card  = team.slots[slot];
          const color = SLOT_COLORS[slot];
          const p     = preview?.[slot];

          return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(138,99,210,0.04)', border: `1px solid ${color}22` }}>
              {/* Slot icon */}
              <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                {SLOT_EMOJI[slot]}
              </div>

              {/* Label + handle */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>
                  {SLOT_LABELS[slot]}
                </div>
                {card?.handle ? (
                  <div style={{ fontSize: 9, color: '#8a7fa0', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{card.handle}
                  </div>
                ) : (
                  <div style={{ fontSize: 8, color: '#5a4a70', marginTop: 1 }}>{SLOT_DESC[slot]}</div>
                )}
              </div>

              {/* Live value + comparison */}
              {p != null ? (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color, lineHeight: 1 }}>{p.value}</div>
                  {p.compared > 0 && (
                    <div style={{ fontSize: 8, color: p.beating > p.compared / 2 ? '#22c55e' : '#7a6a90', marginTop: 1 }}>
                      {p.beating === p.compared ? 'leading' : `${p.beating}/${p.compared}`}
                    </div>
                  )}
                </div>
              ) : (
                card?.thumb ? (
                  <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 7, overflow: 'hidden', border: `1px solid ${color}30`, flexShrink: 0 }}>
                    <Image src={card.thumb} alt={card.handle ?? slot} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 7, border: `1px dashed ${color}30`, flexShrink: 0 }} />
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Update row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          onClick={handleUpdate}
          disabled={updating}
          style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${updating ? 'rgba(138,99,210,0.15)' : 'rgba(138,99,210,0.35)'}`, background: updating ? 'rgba(138,99,210,0.04)' : 'rgba(138,99,210,0.1)', color: updating ? '#7a6a90' : '#c4a4ff', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: updating ? 'default' : 'pointer' }}
        >
          {updating ? 'Checking…' : '↻ Update Live Stats'}
        </button>
      </div>

      {updateError && (
        <div style={{ fontSize: 10, color: '#e63946', textAlign: 'center', marginBottom: 8 }}>{updateError}</div>
      )}

      {updatedAt && !updateError && (
        <div style={{ fontSize: 8, color: '#5a4a70', textAlign: 'center', marginBottom: 10 }}>
          Last checked {timeAgo(updatedAt)}{totalInGroup > 0 ? ` · ${totalInGroup} teams in ${myGroup ?? team.chosenTier}` : ''}
        </div>
      )}

      <button onClick={onGoToTeam} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(138,99,210,0.2)', background: 'transparent', color: '#7a6a90', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
        Edit Team
      </button>
    </div>
  );
}
