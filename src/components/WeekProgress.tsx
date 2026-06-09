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

interface TeamData {
  weekId:        string;
  chosenTier:    string;
  assignedGroup: string | null;
  slotPoints:    number;
  rank:          number | null;
  avgTeamScore:  number;
  slots: Record<SlotType, { fid: number | null; handle: string | null; thumb: string | null; rarity: string | null }>;
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

export default function WeekProgress({ ownerFid, ownerDevice, onGoToTeam }: Props) {
  const [team, setTeam]       = useState<TeamData | null>(null);
  const [player, setPlayer]   = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

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
            avgTeamScore:  Number(t.avg_team_score ?? 0),
            slots: {
              casts:      { fid: t.casts_fid,      handle: t.casts_handle,      thumb: t.casts_thumb,      rarity: t.casts_rarity },
              replies:    { fid: t.replies_fid,    handle: t.replies_handle,    thumb: t.replies_thumb,    rarity: t.replies_rarity },
              followers:  { fid: t.followers_fid,  handle: t.followers_handle,  thumb: t.followers_thumb,  rarity: t.followers_rarity },
              score_rise: { fid: t.score_rise_fid, handle: t.score_rise_handle, thumb: t.score_rise_thumb, rarity: t.score_rise_rarity },
              likes:      { fid: t.likes_fid,      handle: t.likes_handle,      thumb: t.likes_thumb,      rarity: t.likes_rarity },
            },
          });
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

  if (loading) return (
    <div style={{ textAlign: 'center', paddingTop: 40, color: '#7a6a90', fontSize: 11, letterSpacing: '0.2em' }}>Loading…</div>
  );

  if (!team) return (
    <div style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚔</div>
      <p style={{ fontSize: 12, color: '#a08cc0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No team this week</p>
      <p style={{ fontSize: 10, color: '#7a6a90', marginTop: 6, marginBottom: 20 }}>Pick 5 cards, lock in, and compete</p>
      <button
        onClick={onGoToTeam}
        style={{
          padding: '12px 28px', borderRadius: 99,
          border: '1px solid rgba(138,99,210,0.4)',
          background: 'rgba(138,99,210,0.12)', color: '#8a63d2',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
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
      <div style={{
        borderRadius: 14, padding: '14px 16px', marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(138,99,210,0.1), rgba(201,168,76,0.06))',
        border: '1px solid rgba(138,99,210,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 4 }}>
            {team.weekId}
          </div>
          <div style={{
            display: 'inline-block', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em',
            padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase',
            background: `${groupColor}15`, border: `1px solid ${groupColor}40`, color: groupColor,
          }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {SLOT_TYPES.map(slot => {
          const card  = team.slots[slot];
          const color = SLOT_COLORS[slot];

          return (
            <div key={slot} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              background: 'rgba(138,99,210,0.04)',
              border: `1px solid ${color}22`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: `${color}18`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>
                {SLOT_EMOJI[slot]}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>
                  {SLOT_LABELS[slot]}
                </div>
                {card?.handle ? (
                  <div style={{ fontSize: 9, color: '#8a7fa0', marginTop: 1 }}>
                    @{card.handle}{card.rarity ? ` · ${card.rarity}` : ''}
                  </div>
                ) : (
                  <div style={{ fontSize: 8, color: '#5a4a70', marginTop: 1 }}>{SLOT_DESC[slot]}</div>
                )}
              </div>

              {card?.thumb ? (
                <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 7, overflow: 'hidden', border: `1px solid ${color}30`, flexShrink: 0 }}>
                  <Image src={card.thumb} alt={card.handle ?? slot} fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 7, border: `1px dashed ${color}30`, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onGoToTeam}
        style={{
          width: '100%', padding: '11px', borderRadius: 10,
          border: '1px solid rgba(138,99,210,0.25)',
          background: 'transparent', color: '#8a63d2',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Edit Team
      </button>
    </div>
  );
}
