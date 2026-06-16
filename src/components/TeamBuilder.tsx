'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { OwnedCard } from '@/types/card';
import { SlotType, SLOT_TYPES, SLOT_LABELS, SLOT_DESC, SLOT_EMOJI, type EditionBonusSlotDef } from '@/types/league';
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
  referralCode:   string;
}

interface EditionPickState {
  slot: EditionBonusSlotDef;
  card: OwnedCard | null;
  saved: boolean;
  saving: boolean;
  error: string;
  picking: boolean;
}

interface Props {
  owned:     OwnedCard[];
  ownerFid?: number;
}

function blankSlots(): TeamSlots {
  return { casts: null, replies: null, followers: null, score_rise: null, likes: null };
}

export default function TeamBuilder({ owned, ownerFid }: Props) {
  const [slots, setSlots]       = useState<TeamSlots>(blankSlots());
  const [picking, setPicking]   = useState<SlotType | null>(null);
  const [player, setPlayer]     = useState<PlayerInfo | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const [weekId, setWeekId]     = useState('');
  const [lockAt, setLockAt]     = useState<string | null>(null);
  const [editionPicks, setEditionPicks] = useState<EditionPickState[]>([]);

  useEffect(() => {
    if (!ownerFid) return;
    const param = `ownerFid=${ownerFid}`;

    fetch(`/api/players?${param}`)
      .then(r => r.json())
      .then(data => setPlayer({
        protocolPoints: Number(data.protocolPoints ?? 0),
        referralCode: data.referralCode ?? '',
      }))
      .catch(() => {});

    fetch(`/api/week/team?${param}`)
      .then(r => r.json())
      .then(data => {
        setWeekId(data.weekId ?? '');
        setLockAt(data.lockAt ?? null);
        const t = data.team;
        if (!t) return;
        const byFid = new Map(owned.map(o => [o.card.fid, o]));
        setSlots({
          casts:      byFid.get(t.casts_fid)      ?? null,
          replies:    byFid.get(t.replies_fid)    ?? null,
          followers:  byFid.get(t.followers_fid)  ?? null,
          score_rise: byFid.get(t.score_rise_fid) ?? null,
          likes:      byFid.get(t.likes_fid)      ?? null,
        });
        setSaved(true);
      })
      .catch(() => {});
  }, [ownerFid, owned]);

  useEffect(() => {
    if (!ownerFid || !player) return;
    const byFid = new Map(owned.map(o => [o.card.fid, o]));

    Promise.all([
      fetch('/api/editions/slots').then(r => r.json()).catch(() => ({ editions: [] })),
      fetch(`/api/week/edition-pick?ownerFid=${ownerFid}`).then(r => r.json()).catch(() => ({ picks: [] })),
    ]).then(([slotData, pickData]) => {
      const picksByKey = new Map<string, { cardFid: number }>(
        (pickData.picks ?? []).map((p: { editionId: string; slotKey: string; cardFid: number }) => [`${p.editionId}:${p.slotKey}`, p])
      );
      const unlockedSlots: EditionBonusSlotDef[] = (slotData.editions ?? [])
        .flatMap((group: { slots: EditionBonusSlotDef[] }) => group.slots ?? [])
        .filter((slot: EditionBonusSlotDef) => canUnlockEdition(slot.editionId, player.protocolPoints));

      setEditionPicks(unlockedSlots.map(slot => {
        const key = `${slot.editionId}:${slot.slotKey}`;
        const savedPick = picksByKey.get(key);
        const card = savedPick ? byFid.get(savedPick.cardFid) ?? null : null;
        return { slot, card, saved: Boolean(card), saving: false, error: '', picking: false };
      }));
    });
  }, [ownerFid, owned, player]);

  const full = SLOT_TYPES.every(s => slots[s] !== null);
  const mainTeamFids = new Set(SLOT_TYPES.map(s => slots[s]?.card.fid).filter((fid): fid is number => Boolean(fid)));
  const editionFids = new Set(editionPicks.map(p => p.card?.card.fid).filter((fid): fid is number => Boolean(fid)));

  function eligibleFor(slot: SlotType): OwnedCard[] {
    const used = new Set(
      SLOT_TYPES.filter(s => s !== slot && slots[s]).map(s => slots[s]!.card.fid)
    );
    for (const fid of editionFids) used.add(fid);
    return owned.filter(o => !used.has(o.card.fid));
  }

  function eligibleForEdition(index: number): OwnedCard[] {
    const used = new Set(mainTeamFids);
    editionPicks.forEach((p, i) => {
      if (i !== index && p.card) used.add(p.card.card.fid);
    });
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
          castsFid:      slots.casts!.card.fid,
          repliesFid:    slots.replies!.card.fid,
          followersFid:  slots.followers!.card.fid,
          scoreRiseFid:  slots.score_rise!.card.fid,
          likesFid:      slots.likes!.card.fid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setSaved(true);
      setWeekId(data.weekId ?? weekId);
      setLockAt(data.lockAt ?? null);
      if (ownerFid) {
        fetch(`/api/players?ownerFid=${ownerFid}`)
          .then(r => r.json())
          .then(data => setPlayer({ protocolPoints: Number(data.protocolPoints ?? 0), referralCode: data.referralCode ?? '' }))
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveEditionPick(index: number, card: OwnedCard) {
    const pick = editionPicks[index];
    if (!pick) return;

    setEditionPicks(prev => prev.map((p, i) => i === index ? { ...p, card, saving: true, error: '', picking: false } : p));
    try {
      const res = await fetch('/api/week/edition-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerFid,
          editionId: pick.slot.editionId,
          slotKey:   pick.slot.slotKey,
          cardFid:   card.card.fid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save edition slot');
      setEditionPicks(prev => prev.map((p, i) => i === index ? { ...p, saved: true, saving: false } : p));
    } catch (e) {
      setEditionPicks(prev => prev.map((p, i) => i === index ? { ...p, saving: false, error: e instanceof Error ? e.message : 'Save failed' } : p));
    }
  }

  function toggleEditionPicker(index: number) {
    setEditionPicks(prev => prev.map((p, i) => ({ ...p, picking: i === index ? !p.picking : false })));
  }

  const lockedText = lockAt ? 'Round started' : saved ? 'Waiting for another team' : 'Not locked yet';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 4 }}>
          {weekId || 'Current Game'}
        </div>
        <div style={{ fontSize: 11, color: '#7a6a90' }}>
          Pick 5 base slots. Unlock editions with Protocol Points to stack more scoring slots.
        </div>
        {player && (
          <div style={{ marginTop: 8, display: 'inline-flex', gap: 8, alignItems: 'center', padding: '5px 10px', borderRadius: 99, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span style={{ fontSize: 9, color: '#C9A84C', fontWeight: 800 }}>⬡ {player.protocolPoints.toLocaleString()}</span>
            <span style={{ fontSize: 8, color: '#7a6a90', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{lockedText}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {SLOT_TYPES.map(slot => {
          const card = slots[slot];
          const color = SLOT_COLORS[slot];
          const eligible = eligibleFor(slot).length;

          return (
            <div key={slot}>
              <button
                onClick={() => setPicking(picking === slot ? null : slot)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: picking === slot ? `${color}18` : 'rgba(138,99,210,0.05)',
                  border: `1px solid ${picking === slot ? color : `${color}30`}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left',
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
                {card ? (
                  <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: `1px solid ${color}40`, flexShrink: 0 }}>
                    <Image src={card.card.thumbUrl} alt={card.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, border: `1px dashed ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: `${color}50`, flexShrink: 0 }}>+</div>
                )}
              </button>

              {picking === slot && (
                <div style={{ marginTop: 6, paddingLeft: 8 }}>
                  {eligibleFor(slot).length === 0 ? (
                    <div style={{ fontSize: 10, color: '#7a6a90', padding: '10px 0', textAlign: 'center' }}>
                      No cards available. Open packs to add more cards.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
                      {eligibleFor(slot).map(o => (
                        <button
                          key={o.card.fid}
                          onClick={() => {
                            setSlots(s => ({ ...s, [slot]: o }));
                            setPicking(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: 'rgba(138,99,210,0.06)', border: '1px solid rgba(138,99,210,0.15)', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <div style={{ position: 'relative', width: 30, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                            <Image src={o.card.thumbUrl} alt={o.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#e0d4f0' }}>@{o.card.handle}</div>
                            <div style={{ fontSize: 8, color: '#a08cc0' }}>FID {o.card.fid} · {o.card.rarity} · #{o.serialNumber}</div>
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#8a63d2' }}>{o.card.battleScore}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <div style={{ fontSize: 10, color: '#e63946', textAlign: 'center', marginBottom: 8 }}>{error}</div>}

      <button
        onClick={saveTeam}
        disabled={!full || saving}
        style={{
          width: '100%', padding: '14px', borderRadius: 10,
          background: full ? 'linear-gradient(135deg, #8a63d2, #C9A84C)' : 'rgba(138,99,210,0.1)',
          border: 'none', color: full ? '#fff' : '#7a6a90',
          fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: full ? 'pointer' : 'default', transition: 'all 0.2s',
          marginBottom: 10,
        }}
      >
        {saving ? 'Saving…' : !full ? `${SLOT_TYPES.filter(s => !slots[s]).length} Slots Empty` : saved ? 'Update Team' : 'Lock Team'}
      </button>

      {saved && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#22c55e', letterSpacing: '0.1em' }}>TEAM SAVED</div>
          <div style={{ fontSize: 8, color: '#6b5a80', marginTop: 4, lineHeight: 1.5 }}>
            Check My Week to track live progress. Edition slots below stack onto this team.
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.28em', color: '#C9A84C', textTransform: 'uppercase' }}>Edition Slots</div>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
        </div>

        {player && editionPicks.length === 0 && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', color: '#C9A84C', fontSize: 9, lineHeight: 1.6 }}>
            Unlock your first edition slot at {pointsRequiredForEdition('builders').toLocaleString()} Protocol Points. You have {player.protocolPoints.toLocaleString()}.
          </div>
        )}

        {editionPicks.map((pick, index) => {
          const eligible = eligibleForEdition(index);
          const card = pick.card;

          return (
            <div key={pick.slot.id} style={{ marginBottom: 10 }}>
              <button
                onClick={() => toggleEditionPicker(index)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: pick.picking ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.05)',
                  border: `1px solid ${pick.picking ? '#C9A84C' : 'rgba(201,168,76,0.25)'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                  {pick.slot.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: '#C9A84C', textTransform: 'uppercase' }}>
                    {pick.slot.label}
                  </div>
                  {card ? (
                    <div style={{ fontSize: 9, color: '#8a7fa0' }}>@{card.card.handle} · {card.card.rarity}</div>
                  ) : (
                    <div style={{ fontSize: 8, color: '#7a6a90' }}>{pick.slot.description}</div>
                  )}
                </div>
                {card ? (
                  <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.3)', flexShrink: 0 }}>
                    <Image src={card.card.thumbUrl} alt={card.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, border: '1px dashed rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'rgba(201,168,76,0.4)', flexShrink: 0 }}>+</div>
                )}
              </button>

              {pick.picking && (
                <div style={{ marginTop: 6, paddingLeft: 8 }}>
                  {eligible.length === 0 ? (
                    <div style={{ fontSize: 9, color: '#7a6a90', padding: '8px 10px' }}>
                      No unused cards available. Open more packs or change another slot.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                      {eligible.map(o => (
                        <button
                          key={o.card.fid}
                          onClick={() => saveEditionPick(index, o)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <div style={{ position: 'relative', width: 30, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                            <Image src={o.card.thumbUrl} alt={o.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#e0d4f0' }}>@{o.card.handle}</div>
                            <div style={{ fontSize: 8, color: '#a08cc0' }}>FID {o.card.fid} · {o.card.rarity}</div>
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C' }}>{o.card.battleScore}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pick.error && <div style={{ fontSize: 9, color: '#e63946', marginTop: 6 }}>{pick.error}</div>}
              {pick.saved && !pick.saving && <div style={{ fontSize: 9, color: '#22c55e', marginTop: 6, letterSpacing: '0.1em' }}>Edition slot saved</div>}
              {pick.saving && <div style={{ fontSize: 9, color: '#C9A84C', marginTop: 6 }}>Saving…</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
