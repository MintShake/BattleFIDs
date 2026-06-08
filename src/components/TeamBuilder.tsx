'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { OwnedCard, CardType, RarityTier } from '@/types/card';
import { useEdition } from '@/editions/context';

const SLOT_ORDER: CardType[] = ['CAPTAIN', 'BROADCASTER', 'PUBLISHER', 'AGITATOR', 'NETWORKER'];

interface TeamSlots {
  CAPTAIN:     OwnedCard | null;
  BROADCASTER: OwnedCard | null;
  PUBLISHER:   OwnedCard | null;
  AGITATOR:    OwnedCard | null;
  NETWORKER:   OwnedCard | null;
}

interface Props {
  owned:       OwnedCard[];
  ownerFid?:   number;
  ownerDevice: string;
}

export default function TeamBuilder({ owned, ownerFid, ownerDevice }: Props) {
  const edition = useEdition();
  const [slots, setSlots]         = useState<TeamSlots>({ CAPTAIN: null, BROADCASTER: null, PUBLISHER: null, AGITATOR: null, NETWORKER: null });
  const [picking, setPicking]     = useState<CardType | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [weekId, setWeekId]       = useState('');
  const [scores, setScores]       = useState<Record<string, number>>({});
  const [wager, setWager]         = useState('');

  // Load existing team + current scores
  useEffect(() => {
    const param = ownerFid ? `ownerFid=${ownerFid}` : `ownerDeviceId=${ownerDevice}`;
    fetch(`/api/week/team?${param}`)
      .then(r => r.json())
      .then(data => {
        setWeekId(data.weekId ?? '');
        setScores(data.scores ?? {});
        if (!data.team) return;
        const t = data.team;
        // Rebuild slots from owned cards by image_id
        const byId = new Map(owned.map(o => [o.card.imageId, o]));
        setSlots({
          CAPTAIN:     byId.get(t.captain_image_id)     ?? null,
          BROADCASTER: byId.get(t.broadcaster_image_id) ?? null,
          PUBLISHER:   byId.get(t.publisher_image_id)   ?? null,
          AGITATOR:    byId.get(t.agitator_image_id)    ?? null,
          NETWORKER:   byId.get(t.networker_image_id)   ?? null,
        });
      })
      .catch(() => {});
  }, [ownerFid, ownerDevice, owned]);

  const full = SLOT_ORDER.every(t => slots[t] !== null);

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
          ownerDeviceId: ownerFid ? undefined : ownerDevice,
          captainImageId:     slots.CAPTAIN!.card.imageId,
          broadcasterImageId: slots.BROADCASTER!.card.imageId,
          publisherImageId:   slots.PUBLISHER!.card.imageId,
          agitatorImageId:    slots.AGITATOR!.card.imageId,
          networkerImageId:   slots.NETWORKER!.card.imageId,
          wagerUsdc:          parseFloat(wager) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setWeekId(data.weekId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Any card can fill any slot — the slot determines which stat is measured,
  // not the card. Place strategically based on each FID's actual activity.
  function eligibleFor(type: CardType): OwnedCard[] {
    const alreadyUsed = new Set(
      SLOT_ORDER.filter(t => t !== type && slots[t]).map(t => slots[t]!.card.imageId)
    );
    return owned.filter(o => !alreadyUsed.has(o.card.imageId));
  }

  // Estimate team score for display
  const captainRarity = (slots.CAPTAIN?.card.rarity ?? 'Common') as RarityTier;
  const captainMult   = edition.league.captainMult[captainRarity];
  const slotScores    = SLOT_ORDER
    .filter(t => t !== 'CAPTAIN')
    .map(t => scores[slots[t]?.card.imageId ?? ''] ?? 0);
  const baseScore     = slotScores.reduce((a, b) => a + b, 0);
  const teamScore     = Math.round(baseScore * captainMult);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 4 }}>
          {weekId || 'Current Week'}
        </div>
        <div style={{ fontSize: 11, color: '#7a6a90' }}>
          Pick one card per slot · Captain multiplies your total score
        </div>
      </div>

      {/* 5 slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {SLOT_ORDER.map(type => {
          const card    = slots[type];
          const color   = edition.cardSlots[type].color;
          const score   = card ? (scores[card.card.imageId] ?? null) : null;
          const eligible = eligibleFor(type).length;

          return (
            <div
              key={type}
              onClick={() => { setPicking(picking === type ? null : type); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 14,
                background: picking === type ? `${color}18` : 'rgba(138,99,210,0.05)',
                border: `1px solid ${picking === type ? color : `${color}30`}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {/* Slot icon */}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${color}22`, border: `1px solid ${color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>
                {edition.cardSlots[type].icon}
              </div>

              {/* Slot info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color, textTransform: 'uppercase' }}>
                    {edition.league.cardTypeLabels[type]}
                  </span>
                  {type === 'CAPTAIN' && card && (
                    <span style={{ fontSize: 8, color: '#C9A84C', fontWeight: 700 }}>
                      ×{captainMult.toFixed(2)}
                    </span>
                  )}
                </div>
                {card ? (
                  <div style={{ fontSize: 9, color: '#8a7fa0' }}>
                    @{card.card.handle} · FID {card.card.fid}
                    {score !== null && <span style={{ color, fontWeight: 700, marginLeft: 6 }}>{score} pts</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: '#7a6a90' }}>
                    {edition.league.cardTypeDescs[type]} · {eligible} eligible
                  </div>
                )}
              </div>

              {/* PFP thumbnail or empty slot */}
              {card ? (
                <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: `1px solid ${color}40`, flexShrink: 0 }}>
                  <Image src={card.card.thumbUrl} alt={card.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: `1px dashed ${color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: `${color}40`, flexShrink: 0,
                }}>+</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Card picker — shown inline below the active slot */}
      {picking && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: edition.cardSlots[picking].color, textTransform: 'uppercase', marginBottom: 8 }}>
            Choose {edition.league.cardTypeLabels[picking]}
          </div>
          {eligibleFor(picking).length === 0 ? (
            <div style={{ fontSize: 11, color: '#7a6a90', padding: '12px 0', textAlign: 'center' }}>
              {picking === 'CAPTAIN'
                ? 'No cards in your collection yet'
                : `No ${edition.league.cardTypeLabels[picking]} cards — open a pack or buy one from browse`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {eligibleFor(picking).map(o => (
                <div
                  key={o.card.imageId}
                  onClick={(e) => { e.stopPropagation(); setSlots(s => ({ ...s, [picking]: o })); setPicking(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10,
                    background: 'rgba(138,99,210,0.06)', border: '1px solid rgba(138,99,210,0.15)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                    <Image src={o.card.thumbUrl} alt={o.card.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#e0d4f0' }}>@{o.card.handle}</div>
                    <div style={{ fontSize: 8, color: '#a08cc0' }}>
                      FID {o.card.fid} · {o.card.rarity}
                      {picking === 'CAPTAIN' && ` · ${edition.league.captainMult[o.card.rarity as RarityTier]}×`}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#8a63d2' }}>
                    {o.card.battleScore} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Score preview + save */}
      <div style={{
        borderRadius: 14, padding: '12px 16px',
        background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: '#5c4030', textTransform: 'uppercase' }}>
            Team Score
          </div>
          <div style={{ fontSize: 9, color: '#5c4030', marginTop: 2 }}>
            ×{captainMult.toFixed(2)} captain · {slotScores.filter(Boolean).length}/4 scored
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#C9A84C' }}>{teamScore}</div>
      </div>

      {/* Wager for Xplora credits */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: '#a08cc0', textTransform: 'uppercase' }}>
            Stake USDC · Win Xplora Credits
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 5, 10, 25].map(v => {
            const xp = v * 100;
            const active = (parseFloat(wager) || 0) === v;
            return (
              <button
                key={v}
                onClick={() => setWager(v === 0 ? '' : String(v))}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8,
                  border: `1px solid ${active ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                  background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: active ? '#C9A84C' : '#a08cc0',
                  fontSize: 9, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span>{v === 0 ? 'Free' : `$${v}`}</span>
                {v > 0 && <span style={{ fontSize: 7, opacity: 0.7 }}>{xp} XP pool</span>}
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: 8, padding: '8px 10px', borderRadius: 8,
          background: 'rgba(58,155,220,0.06)', border: '1px solid rgba(58,155,220,0.15)',
        }}>
          {(parseFloat(wager) || 0) > 0 ? (
            <div style={{ fontSize: 8, color: '#3a9bdc', lineHeight: 1.5 }}>
              Your ${wager} USDC stakes {parseFloat(wager) * 100} XP into the credit pool.
              Top 3 wager teams split the pool by score. Credits land in your Xplora wallet.
            </div>
          ) : (
            <div style={{ fontSize: 8, color: '#4a5c70', lineHeight: 1.5 }}>
              Free entry · compete for leaderboard position · top 3 free players earn 25 XP.
              Stake USDC to enter the credit prize pool.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 10, color: '#e63946', textAlign: 'center', marginBottom: 8 }}>{error}</div>
      )}

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
        {saving ? 'Saving…' : saved ? '✓ Team Locked In' : full ? 'Lock In Team' : `${SLOT_ORDER.filter(t => !slots[t]).length} Slots Empty`}
      </button>
    </div>
  );
}
