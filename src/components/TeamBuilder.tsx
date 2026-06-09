'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { OwnedCard } from '@/types/card';
import { SlotType, SLOT_TYPES, SLOT_LABELS, SLOT_DESC, SLOT_EMOJI, PlayerTier, TIER_LABELS, TIER_DESC } from '@/types/league';

const SLOT_COLORS: Record<SlotType, string> = {
  casts:      '#8a63d2',
  replies:    '#3a9bdc',
  followers:  '#22c55e',
  score_rise: '#C9A84C',
  likes:      '#e63946',
};

interface TeamSlots {
  casts:      OwnedCard | null;
  replies:    OwnedCard | null;
  followers:  OwnedCard | null;
  score_rise: OwnedCard | null;
  likes:      OwnedCard | null;
}

interface PlayerInfo {
  protocolPoints: number;
  tier:           PlayerTier;
  lockedToPro:    boolean;
  referralCode:   string;
}

interface Props {
  owned:       OwnedCard[];
  ownerFid?:   number;
  ownerDevice: string;
}

export default function TeamBuilder({ owned, ownerFid, ownerDevice }: Props) {
  const [slots, setSlots]       = useState<TeamSlots>({ casts: null, replies: null, followers: null, score_rise: null, likes: null });
  const [picking, setPicking]   = useState<SlotType | null>(null);
  const [chosenTier, setChosenTier] = useState<PlayerTier>('beginner');
  const [player, setPlayer]     = useState<PlayerInfo | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [locked, setLocked]     = useState(false);
  const [error, setError]       = useState('');
  const [weekId, setWeekId]     = useState('');

  // Load player + existing team
  useEffect(() => {
    const param = ownerFid ? `ownerFid=${ownerFid}` : `ownerDeviceId=${ownerDevice}`;

    // Fetch player info
    fetch(`/api/players?${param}`)
      .then(r => r.json())
      .then(data => {
        setPlayer(data);
        if (data.lockedToPro) setChosenTier('pro');
      })
      .catch(() => {});

    // Fetch existing team
    fetch(`/api/week/team?${param}`)
      .then(r => r.json())
      .then(data => {
        setWeekId(data.weekId ?? '');
        if (!data.team) return;
        const t = data.team;
        const byFid = new Map(owned.map(o => [o.card.fid, o]));
        setSlots({
          casts:      byFid.get(t.casts_fid)      ?? null,
          replies:    byFid.get(t.replies_fid)     ?? null,
          followers:  byFid.get(t.followers_fid)   ?? null,
          score_rise: byFid.get(t.score_rise_fid)  ?? null,
          likes:      byFid.get(t.likes_fid)        ?? null,
        });
        if (t.chosen_tier) setChosenTier(t.chosen_tier as PlayerTier);
        // If team is locked (has assigned_group or week is in progress), lock UI
        if (t.assigned_group || t.slot_points > 0) setLocked(true);
      })
      .catch(() => {});
  }, [ownerFid, ownerDevice, owned]);

  const full = SLOT_TYPES.every(s => slots[s] !== null);

  function eligibleFor(slot: SlotType): OwnedCard[] {
    const used = new Set(
      SLOT_TYPES.filter(s => s !== slot && slots[s]).map(s => slots[s]!.card.fid)
    );
    return owned.filter(o => !used.has(o.card.fid));
  }

  async function saveTeam() {
    if (!full || locked) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/week/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerFid,
          ownerDeviceId: ownerFid ? undefined : ownerDevice,
          castsFid:      slots.casts!.card.fid,
          repliesFid:    slots.replies!.card.fid,
          followersFid:  slots.followers!.card.fid,
          scoreRiseFid:  slots.score_rise!.card.fid,
          likesFid:      slots.likes!.card.fid,
          chosenTier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setWeekId(data.weekId);
      setSaved(true);
      setLocked(true);
      // Refresh player points
      const param = ownerFid ? `ownerFid=${ownerFid}` : `ownerDeviceId=${ownerDevice}`;
      fetch(`/api/players?${param}`).then(r => r.json()).then(setPlayer).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const canChooseTier = player && !player.lockedToPro;

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 4 }}>
          {weekId || 'Current Week'}
        </div>
        <div style={{ fontSize: 11, color: '#7a6a90' }}>
          Pick one card per slot · your prediction for the week
        </div>
        {player && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 9, color: '#C9A84C', fontWeight: 700 }}>
              ⬡ {player.protocolPoints.toLocaleString()} pts
            </div>
            <div style={{
              fontSize: 8, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
              background: player.tier === 'pro' ? 'rgba(201,168,76,0.15)' : player.tier === 'confident' ? 'rgba(138,99,210,0.15)' : 'rgba(34,197,94,0.12)',
              color: player.tier === 'pro' ? '#C9A84C' : player.tier === 'confident' ? '#a78bfa' : '#22c55e',
              border: `1px solid ${player.tier === 'pro' ? '#C9A84C40' : player.tier === 'confident' ? '#a78bfa40' : '#22c55e40'}`,
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              {TIER_LABELS[player.tier]}
            </div>
          </div>
        )}
      </div>

      {/* Tier choice — hidden if locked to Pro */}
      {canChooseTier && !locked && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 6 }}>
            Enter as
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['beginner', 'confident'] as PlayerTier[]).map(tier => (
              <button
                key={tier}
                onClick={() => setChosenTier(tier)}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 10,
                  border: `1px solid ${chosenTier === tier ? (tier === 'confident' ? '#a78bfa' : '#22c55e') : 'rgba(138,99,210,0.2)'}`,
                  background: chosenTier === tier ? (tier === 'confident' ? 'rgba(167,139,250,0.1)' : 'rgba(34,197,94,0.08)') : 'transparent',
                  color: chosenTier === tier ? (tier === 'confident' ? '#a78bfa' : '#22c55e') : '#7a6a90',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {TIER_LABELS[tier]}
                </div>
                <div style={{ fontSize: 7, marginTop: 2, lineHeight: 1.4, opacity: 0.8 }}>
                  {tier === 'confident' ? '50/50 — Beginner or Pro revealed at lock' : TIER_DESC[tier]}
                </div>
              </button>
            ))}
          </div>
          {chosenTier === 'confident' && (
            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', fontSize: 8, color: '#a08cc0', lineHeight: 1.5 }}>
              ⚡ You won't know your bracket until after you submit. Pro pool earns more points.
            </div>
          )}
        </div>
      )}

      {/* Pro locked notice */}
      {player?.lockedToPro && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', fontSize: 8, color: '#C9A84C', lineHeight: 1.5 }}>
          ★ Your avg team score reached the Pro threshold — you compete in the Pro group.
        </div>
      )}

      {/* 5 slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {SLOT_TYPES.map(slot => {
          const card    = slots[slot];
          const color   = SLOT_COLORS[slot];
          const eligible = eligibleFor(slot).length;

          return (
            <div key={slot}>
              <div
                onClick={() => { if (!locked) setPicking(picking === slot ? null : slot); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 14,
                  background: picking === slot ? `${color}18` : 'rgba(138,99,210,0.05)',
                  border: `1px solid ${picking === slot ? color : `${color}30`}`,
                  cursor: locked ? 'default' : 'pointer', transition: 'all 0.15s',
                }}
              >
                {/* Slot emoji */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${color}18`, border: `1px solid ${color}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, flexShrink: 0,
                }}>
                  {SLOT_EMOJI[slot]}
                </div>

                {/* Slot info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>
                    {SLOT_LABELS[slot]}
                  </div>
                  {card ? (
                    <div style={{ fontSize: 9, color: '#8a7fa0' }}>
                      @{card.card.handle} · FID {card.card.fid} · {card.card.rarity}
                    </div>
                  ) : (
                    <div style={{ fontSize: 8, color: '#7a6a90' }}>
                      {SLOT_DESC[slot]} · {eligible} eligible
                    </div>
                  )}
                </div>

                {card ? (
                  <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: `1px solid ${color}40`, flexShrink: 0 }}>
                    <Image src={card.card.thumbUrl} alt={card.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: `1px dashed ${color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: `${color}50`, flexShrink: 0,
                  }}>+</div>
                )}
              </div>

              {/* Inline card picker */}
              {picking === slot && (
                <div style={{ marginTop: 6, marginBottom: 2, paddingLeft: 8 }}>
                  {eligibleFor(slot).length === 0 ? (
                    <div style={{ fontSize: 10, color: '#7a6a90', padding: '10px 0', textAlign: 'center' }}>
                      No cards available — open a pack first
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
                      {eligibleFor(slot).map(o => (
                        <div
                          key={o.card.fid}
                          onClick={e => { e.stopPropagation(); setSlots(s => ({ ...s, [slot]: o })); setPicking(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 10px', borderRadius: 10,
                            background: 'rgba(138,99,210,0.06)', border: '1px solid rgba(138,99,210,0.15)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ position: 'relative', width: 30, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                            <Image src={o.card.thumbUrl} alt={o.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#e0d4f0' }}>@{o.card.handle}</div>
                            <div style={{ fontSize: 8, color: '#a08cc0' }}>FID {o.card.fid} · {o.card.rarity} · #{o.serialNumber}</div>
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#8a63d2' }}>
                            {o.card.battleScore}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ fontSize: 10, color: '#e63946', textAlign: 'center', marginBottom: 8 }}>{error}</div>
      )}

      {/* Locked state */}
      {locked && saved && (
        <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#22c55e', letterSpacing: '0.1em' }}>✓ TEAM LOCKED IN</div>
          {chosenTier === 'confident' && (
            <div style={{ fontSize: 9, color: '#a08cc0', marginTop: 4 }}>Your bracket (Beginner or Pro) will be revealed at lock deadline.</div>
          )}
        </div>
      )}

      {!locked && (
        <button
          onClick={saveTeam}
          disabled={!full || saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: full ? 'linear-gradient(135deg, #8a63d2, #C9A84C)' : 'rgba(138,99,210,0.1)',
            border: 'none', color: full ? '#fff' : '#7a6a90',
            fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
            cursor: full ? 'pointer' : 'default', transition: 'all 0.2s',
          }}
        >
          {saving ? 'Locking…' : full ? `Lock In · ${TIER_LABELS[chosenTier]}` : `${SLOT_TYPES.filter(s => !slots[s]).length} Slots Empty`}
        </button>
      )}
    </div>
  );
}
