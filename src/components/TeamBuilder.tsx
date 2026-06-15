'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { OwnedCard } from '@/types/card';
import { SlotType, SLOT_TYPES, SLOT_LABELS, SLOT_DESC, SLOT_EMOJI, PlayerTier, TIER_LABELS, TIER_DESC, type EditionBonusSlotDef } from '@/types/league';
import { useEdition } from '@/editions/context';
import { canUnlockEdition, pointsRequiredForEdition } from '@/lib/editionUnlocks';

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

interface CurrentWeekSummary {
  weekId:        string;
  slotPoints:    number;
  rank:          number | null;
  tier:          string;
  assignedGroup: string | null;
}

interface Props {
  owned:     OwnedCard[];
  ownerFid?: number;
}

// Compute next ISO week ID client-side (no server import needed)
function computeNextWeekId(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default function TeamBuilder({ owned, ownerFid }: Props) {
  const currentEdition = useEdition();
  // Builder state (targets either current or next week)
  const [slots, setSlots]           = useState<TeamSlots>({ casts: null, replies: null, followers: null, score_rise: null, likes: null });
  const [picking, setPicking]       = useState<SlotType | null>(null);
  const [chosenTier, setChosenTier] = useState<PlayerTier>('beginner');
  const [player, setPlayer]         = useState<PlayerInfo | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');
  const [weekId, setWeekId]         = useState('');  // current week ID (for display)

  // Week mode
  const [buildingForNextWeek, setBuildingForNextWeek]     = useState(false);
  const [targetWeekId, setTargetWeekId]                   = useState('');
  const [currentWeekSummary, setCurrentWeekSummary]       = useState<CurrentWeekSummary | null>(null);

  // Draft preview (next-week mode only — compares vs current week's locked teams)
  const [draftPreview, setDraftPreview]     = useState<Record<SlotType, { value: number; beating: number; compared: number }> | null>(null);
  const [previewUpdating, setPreviewUpdating] = useState(false);
  const [previewErr, setPreviewErr]         = useState('');

  // Edition bonus slots
  const [editionSlots, setEditionSlots]                             = useState<{ editionId: string; slots: EditionBonusSlotDef[] }[]>([]);
  const [activeEdition, setActiveEdition]                           = useState<string | null>(null);
  const [activeEditionSlotKey, setActiveEditionSlotKey]             = useState<string | null>(null);
  const [editionCard, setEditionCard]                               = useState<OwnedCard | null>(null);
  const [editionPicking, setEditionPicking]                         = useState(false);
  const [editionSaving, setEditionSaving]                           = useState(false);
  const [editionSaved, setEditionSaved]                             = useState(false);
  const [editionError, setEditionError]                             = useState('');

  useEffect(() => {
    if (!ownerFid) return;
    const param = `ownerFid=${ownerFid}`;

    fetch(`/api/players?${param}`)
      .then(r => r.json())
      .then(data => {
        setPlayer(data);
        if (data.lockedToPro) setChosenTier('pro');
      })
      .catch(() => {});

    fetch('/api/editions/slots')
      .then(r => r.json())
      .then(data => setEditionSlots(data.editions ?? []))
      .catch(() => {});

    fetch(`/api/week/edition-pick?${param}`)
      .then(r => r.json())
      .then(data => {
        const picks = data.picks ?? [];
        const p = picks.find((pick: { editionId: string }) => pick.editionId === currentEdition.id);
        if (p) {
          setActiveEdition(p.editionId);
          setActiveEditionSlotKey(p.slotKey);
          const card = owned.find(o => o.card.fid === p.cardFid) ?? null;
          setEditionCard(card);
          if (card) setEditionSaved(true);
        } else if (currentEdition.id !== 'base') {
          setActiveEdition(currentEdition.id);
          setActiveEditionSlotKey(null);
          setEditionCard(null);
          setEditionSaved(false);
        }
      })
      .catch(() => {});

    // Load current week team to determine mode
    fetch(`/api/week/team?${param}`)
      .then(r => r.json())
      .then(data => {
        const cwId = data.weekId ?? '';
        setWeekId(cwId);
        const t = data.team;

        if (t) {
          const isLocked = true; // any saved team = locked for the current week

          if (isLocked) {
            // Current week is locked — switch to next-week builder
            setCurrentWeekSummary({
              weekId:        cwId,
              slotPoints:    Number(t.slot_points ?? 0),
              rank:          t.rank ? Number(t.rank) : null,
              tier:          t.chosen_tier ?? 'beginner',
              assignedGroup: t.assigned_group ?? null,
            });
            setBuildingForNextWeek(true);
            const nwId = computeNextWeekId();
            setTargetWeekId(nwId);

            // Load next week's existing draft (if any)
            fetch(`/api/week/team?${param}&weekId=${nwId}`)
              .then(r => r.json())
              .then(nwData => {
                if (nwData.team) {
                  const nwt = nwData.team;
                  const byFid = new Map(owned.map(o => [o.card.fid, o]));
                  setSlots({
                    casts:      byFid.get(nwt.casts_fid)      ?? null,
                    replies:    byFid.get(nwt.replies_fid)     ?? null,
                    followers:  byFid.get(nwt.followers_fid)   ?? null,
                    score_rise: byFid.get(nwt.score_rise_fid)  ?? null,
                    likes:      byFid.get(nwt.likes_fid)       ?? null,
                  });
                  if (nwt.chosen_tier) setChosenTier(nwt.chosen_tier as PlayerTier);
                  setSaved(true);
                }
              })
              .catch(() => {});
          } else {
            // Current week team exists but isn't locked yet — show normal builder
            setTargetWeekId(cwId);
            const byFid = new Map(owned.map(o => [o.card.fid, o]));
            setSlots({
              casts:      byFid.get(t.casts_fid)      ?? null,
              replies:    byFid.get(t.replies_fid)     ?? null,
              followers:  byFid.get(t.followers_fid)   ?? null,
              score_rise: byFid.get(t.score_rise_fid)  ?? null,
              likes:      byFid.get(t.likes_fid)       ?? null,
            });
            if (t.chosen_tier) setChosenTier(t.chosen_tier as PlayerTier);
          }
        } else {
          // No team yet — normal current-week builder
          setTargetWeekId(cwId);
        }
      })
      .catch(() => {});
  }, [ownerFid, owned, currentEdition.id]);

  const full = SLOT_TYPES.every(s => slots[s] !== null);

  function eligibleFor(slot: SlotType): OwnedCard[] {
    const used = new Set(
      SLOT_TYPES.filter(s => s !== slot && slots[s]).map(s => slots[s]!.card.fid)
    );
    return owned.filter(o => !used.has(o.card.fid));
  }

  async function saveTeam() {
    if (!full) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/week/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerFid,
          targetWeekId,
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
      setSaved(true);
      // For current-week lock, switch to next-week mode on next load (don't switch immediately)
      if (ownerFid) fetch(`/api/players?ownerFid=${ownerFid}`).then(r => r.json()).then(setPlayer).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Draft preview — compare next-week picks vs current week's live standings
  async function checkDraftPreview() {
    if (!full || !ownerFid) return;
    setPreviewUpdating(true);
    setPreviewErr('');
    try {
      const res = await fetch('/api/week/score/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerFid,
          draftFids: {
            castsFid:     slots.casts!.card.fid,
            repliesFid:   slots.replies!.card.fid,
            followersFid: slots.followers!.card.fid,
            scoreRiseFid: slots.score_rise!.card.fid,
            likesFid:     slots.likes!.card.fid,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Preview failed');
      setDraftPreview(data.slots);
    } catch (e) {
      setPreviewErr(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setPreviewUpdating(false);
    }
  }

  const canChooseTier = !!(player && !player.lockedToPro);

  const activeEditionGroup = editionSlots.find(e => e.editionId === activeEdition);
  const activeBonusSlot    = activeEditionGroup
    ? (activeEditionGroup.slots.find(s => s.slotKey === activeEditionSlotKey)
        ?? (activeEditionGroup.slots.length === 1 ? activeEditionGroup.slots[0] : null))
    : null;
  const editionRequiredPoints = pointsRequiredForEdition(currentEdition.id);
  const editionUnlocked = canUnlockEdition(currentEdition.id, player?.protocolPoints ?? 0);
  const mainTeamFids = new Set(SLOT_TYPES.map(s => slots[s]?.card.fid).filter((fid): fid is number => Boolean(fid)));
  const eligibleEditionCards = owned.filter(o => !mainTeamFids.has(o.card.fid));

  async function clearEditionPick() {
    if (activeEdition && activeBonusSlot && ownerFid) {
      await fetch(`/api/week/edition-pick?ownerFid=${ownerFid}&editionId=${activeEdition}&slotKey=${activeBonusSlot.slotKey}`, { method: 'DELETE' }).catch(() => {});
    }
    setActiveEdition(null);
    setActiveEditionSlotKey(null);
    setEditionCard(null);
    setEditionSaved(false);
    setEditionError('');
  }

  async function saveEditionPick(card: OwnedCard) {
    if (!activeBonusSlot) return;
    setEditionCard(card);
    setEditionPicking(false);
    setEditionSaving(true);
    setEditionError('');
    try {
      const res = await fetch('/api/week/edition-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerFid,
          editionId: activeBonusSlot.editionId,
          slotKey:   activeBonusSlot.slotKey,
          cardFid:   card.card.fid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save edition pick');
      setEditionSaved(true);
    } catch (e) {
      setEditionError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setEditionSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Current week locked summary — shown only when building for next week */}
      {buildingForNextWeek && currentWeekSummary && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 12,
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.25em', color: '#22c55e', textTransform: 'uppercase', marginBottom: 2 }}>
                ✓ {currentWeekSummary.weekId} · Locked
              </div>
              <div style={{ fontSize: 8, color: '#6b5a80' }}>
                {currentWeekSummary.slotPoints > 0
                  ? `${currentWeekSummary.slotPoints} pts${currentWeekSummary.rank ? ` · #${currentWeekSummary.rank}` : ''}`
                  : 'Competing — check progress tab'}
              </div>
            </div>
            <div style={{
              fontSize: 7, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e',
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              {currentWeekSummary.tier}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        {buildingForNextWeek ? (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 4 }}>
              Next Week · {targetWeekId || '…'}
            </div>
            <div style={{ fontSize: 11, color: '#7a6a90' }}>
              Draft your team · locks in at Sunday midnight
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 4 }}>
              {weekId || 'Current Week'}
            </div>
            <div style={{ fontSize: 11, color: '#7a6a90' }}>
              Pick one card per slot · your prediction for the week
            </div>
          </>
        )}
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

      {/* Tier choice */}
      {canChooseTier && (
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

      {player?.lockedToPro && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', fontSize: 8, color: '#C9A84C', lineHeight: 1.5 }}>
          ★ Your avg team score reached the Pro threshold — you compete in the Pro group.
        </div>
      )}

      {/* 5 slot rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {SLOT_TYPES.map(slot => {
          const card    = slots[slot];
          const color   = SLOT_COLORS[slot];
          const eligible = eligibleFor(slot).length;
          const dp = draftPreview?.[slot] ?? null;

          return (
            <div key={slot}>
              <div
                onClick={() => setPicking(picking === slot ? null : slot)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 14,
                  background: picking === slot ? `${color}18` : 'rgba(138,99,210,0.05)',
                  border: `1px solid ${picking === slot ? color : `${color}30`}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                  {SLOT_EMOJI[slot]}
                </div>

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

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  {card ? (
                    <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: `1px solid ${color}40` }}>
                      <Image src={card.card.thumbUrl} alt={card.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 8, border: `1px dashed ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: `${color}50` }}>+</div>
                  )}
                  {/* Draft preview indicator */}
                  {dp && (
                    <div style={{ fontSize: 7, fontWeight: 700, color: dp.beating >= dp.compared / 2 ? '#22c55e' : '#7a6a90', letterSpacing: '0.08em' }}>
                      {dp.value} · {dp.compared > 0 ? `beat ${dp.beating}/${dp.compared}` : 'no data'}
                    </div>
                  )}
                </div>
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
                          onClick={e => {
                            e.stopPropagation();
                            setSlots(s => ({ ...s, [slot]: o }));
                            setPicking(null);
                            setDraftPreview(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: 'rgba(138,99,210,0.06)', border: '1px solid rgba(138,99,210,0.15)', cursor: 'pointer' }}
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

      {/* Save / Lock button */}
      <button
        onClick={saveTeam}
        disabled={!full || saving}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: full ? (buildingForNextWeek ? 'linear-gradient(135deg, #C9A84C, #8a63d2)' : 'linear-gradient(135deg, #8a63d2, #C9A84C)') : 'rgba(138,99,210,0.1)',
          border: 'none', color: full ? '#fff' : '#7a6a90',
          fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: full ? 'pointer' : 'default', transition: 'all 0.2s',
          marginBottom: 8,
        }}
      >
        {saving
          ? (buildingForNextWeek ? 'Saving draft…' : 'Locking…')
          : !full
            ? `${SLOT_TYPES.filter(s => !slots[s]).length} Slots Empty`
            : buildingForNextWeek
              ? (saved ? `✓ Update Next Week · ${TIER_LABELS[chosenTier]}` : `Save for Next Week · ${TIER_LABELS[chosenTier]}`)
              : `Lock In · ${TIER_LABELS[chosenTier]}`}
      </button>

      {/* Confirmation messages */}
      {saved && buildingForNextWeek && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#C9A84C', letterSpacing: '0.1em' }}>✓ DRAFT SAVED · {targetWeekId}</div>
          <div style={{ fontSize: 8, color: '#7a6a90', marginTop: 3 }}>Locks in at Sunday midnight. Edit any time before then.</div>
        </div>
      )}

      {saved && !buildingForNextWeek && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#22c55e', letterSpacing: '0.1em' }}>✓ TEAM LOCKED IN</div>
          {chosenTier === 'confident' && (
            <div style={{ fontSize: 9, color: '#a08cc0', marginTop: 4 }}>Your bracket (Beginner or Pro) will be revealed at lock deadline.</div>
          )}
          <div style={{ fontSize: 8, color: '#6b5a80', marginTop: 4, lineHeight: 1.5 }}>
            Check "My Week" to track live progress. Come back here to draft next week&apos;s team.
          </div>
        </div>
      )}

      {/* Draft preview — next-week mode only */}
      {buildingForNextWeek && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={checkDraftPreview}
            disabled={!full || previewUpdating}
            style={{
              width: '100%', padding: '11px', borderRadius: 10,
              border: `1px solid ${full ? 'rgba(138,99,210,0.35)' : 'rgba(138,99,210,0.1)'}`,
              background: full ? 'rgba(138,99,210,0.08)' : 'transparent',
              color: full ? '#a08cc0' : '#3a2a50',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: full ? 'pointer' : 'default', transition: 'all 0.15s',
            }}
          >
            {previewUpdating ? 'Checking…' : '↻  Preview vs This Week\'s Leaders'}
          </button>
          {previewErr && <div style={{ fontSize: 9, color: '#e63946', textAlign: 'center', marginTop: 4 }}>{previewErr}</div>}
          {draftPreview && !previewUpdating && (
            <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(138,99,210,0.05)', border: '1px solid rgba(138,99,210,0.15)', fontSize: 8, color: '#7a6a90', lineHeight: 1.7 }}>
              Comparing your draft picks against this week&apos;s live standings. Values reset Monday when the new week starts.
            </div>
          )}
        </div>
      )}

      {/* ── Active edition bonus slot (current week only) ── */}
      {!buildingForNextWeek && currentEdition.id !== 'base' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#C9A84C', textTransform: 'uppercase' }}>★ {currentEdition.name}</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
          </div>

          {!editionUnlocked && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C', fontSize: 9, lineHeight: 1.6, marginBottom: 10 }}>
              Edition slots unlock at {editionRequiredPoints.toLocaleString()} Protocol Points. You have {(player?.protocolPoints ?? 0).toLocaleString()}.
            </div>
          )}

          {editionUnlocked && activeEdition && activeEditionGroup && activeEditionGroup.slots.length > 1 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
              {activeEditionGroup.slots.map(slot => (
                <button
                  key={slot.slotKey}
                  onClick={() => { setActiveEditionSlotKey(slot.slotKey); setEditionCard(null); setEditionSaved(false); setEditionPicking(false); }}
                  style={{
                    padding: '5px 12px', borderRadius: 99,
                    border: activeEditionSlotKey === slot.slotKey ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)',
                    background: activeEditionSlotKey === slot.slotKey ? 'rgba(201,168,76,0.1)' : 'transparent',
                    color: activeEditionSlotKey === slot.slotKey ? '#C9A84C' : '#5a4a70',
                    fontSize: 9, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {slot.emoji} {slot.label}
                </button>
              ))}
            </div>
          )}

          {editionUnlocked && activeBonusSlot && (
            <div>
              <div
                onClick={() => setEditionPicking(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 14,
                  background: editionPicking ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.05)',
                  border: `1px solid ${editionPicking ? '#C9A84C' : 'rgba(201,168,76,0.25)'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                  {activeBonusSlot.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: '#C9A84C', textTransform: 'uppercase' }}>
                    {activeBonusSlot.label}
                  </div>
                  {editionCard
                    ? <div style={{ fontSize: 9, color: '#8a7fa0' }}>@{editionCard.card.handle} · {editionCard.card.rarity}</div>
                    : <div style={{ fontSize: 8, color: '#7a6a90' }}>{activeBonusSlot.description}</div>
                  }
                </div>
                {editionCard ? (
                  <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.3)', flexShrink: 0 }}>
                    <Image src={editionCard.card.thumbUrl} alt={editionCard.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, border: '1px dashed rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'rgba(201,168,76,0.4)', flexShrink: 0 }}>+</div>
                )}
              </div>

              {editionPicking && (
                <div style={{ marginTop: 6, paddingLeft: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                    {eligibleEditionCards.length === 0 && (
                      <div style={{ fontSize: 9, color: '#7a6a90', padding: '8px 10px' }}>
                        All owned cards are already in your main team. Open more packs to add an edition slot.
                      </div>
                    )}
                    {eligibleEditionCards.map(o => (
                      <div
                        key={o.card.fid}
                        onClick={() => saveEditionPick(o)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', cursor: 'pointer' }}
                      >
                        <div style={{ position: 'relative', width: 30, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          <Image src={o.card.thumbUrl} alt={o.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#e0d4f0' }}>@{o.card.handle}</div>
                          <div style={{ fontSize: 8, color: '#a08cc0' }}>FID {o.card.fid} · {o.card.rarity}</div>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C' }}>{o.card.battleScore}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editionError && <div style={{ fontSize: 9, color: '#e63946', marginTop: 6 }}>{editionError}</div>}
              {editionSaved && !editionSaving && <div style={{ fontSize: 9, color: '#22c55e', marginTop: 6, letterSpacing: '0.1em' }}>✓ Edition slot saved</div>}
              {editionSaving && <div style={{ fontSize: 9, color: '#C9A84C', marginTop: 6 }}>Saving…</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
