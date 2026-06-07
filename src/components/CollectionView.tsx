'use client';

import { useState } from 'react';
import { OwnedCard, BattleFIDCard, STAT_LABELS, STAT_ORDER, StatKey } from '@/types/card';
import BattleCard from './BattleCard';

interface Props {
  owned: OwnedCard[];
}

export default function CollectionView({ owned }: Props) {
  const [selected, setSelected] = useState<OwnedCard[]>([]);

  function toggleSelect(oc: OwnedCard) {
    if (selected.includes(oc)) {
      setSelected(selected.filter((c) => c !== oc));
    } else if (selected.length < 2) {
      setSelected([...selected, oc]);
    } else {
      setSelected([selected[1], oc]);
    }
  }

  const [slotA, slotB] = selected;
  const hasBattle = selected.length === 2;
  const cardA = slotA?.card;
  const cardB = slotB?.card;
  const winner =
    hasBattle && cardA.battleScore !== cardB.battleScore
      ? cardA.battleScore > cardB.battleScore ? cardA : cardB
      : null;

  if (owned.length === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80, color: '#374151' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚔</div>
        <p style={{ fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          No cards yet — open a pack to start collecting.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Battle arena */}
      {hasBattle && (
        <div
          style={{
            maxWidth: 860, margin: '0 auto 40px',
            borderRadius: 20, padding: '20px 16px',
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.12)',
          }}
        >
          <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#4b5563', textTransform: 'uppercase', marginBottom: 20 }}>
            ⚔ Battle Arena ⚔
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
            <BattleCard card={cardA} selected compact serialNumber={slotA.serialNumber} onClick={() => toggleSelect(slotA)} />

            <div style={{ minWidth: 160, maxWidth: 200, flex: 1 }}>
              <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 900, color: '#1f2937', marginBottom: 14 }}>VS</div>
              {STAT_ORDER.map((key: StatKey) => {
                const a = cardA.stats[key];
                const b = cardB.stats[key];
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 9, gap: 6 }}>
                    <span style={{ width: 30, textAlign: 'right', fontSize: 14, fontWeight: 900, color: a > b ? '#00ff88' : '#374151' }}>{a}</span>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', color: '#4b5563', textTransform: 'uppercase' }}>
                      {STAT_LABELS[key]}
                    </div>
                    <span style={{ width: 30, textAlign: 'left', fontSize: 14, fontWeight: 900, color: b > a ? '#00ff88' : '#374151' }}>{b}</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                {winner ? (
                  <>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: '#4b5563', textTransform: 'uppercase', marginBottom: 4 }}>Winner</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#00ff88' }}>{winner.displayName}</div>
                    <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>
                      {Math.max(cardA.battleScore, cardB.battleScore)} vs {Math.min(cardA.battleScore, cardB.battleScore)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#FFD700' }}>TIE</div>
                )}
              </div>
            </div>

            <BattleCard card={cardB} selected compact serialNumber={slotB.serialNumber} onClick={() => toggleSelect(slotB)} />
          </div>
        </div>
      )}

      {/* Instruction */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#374151' }}>
          {selected.length === 0
            ? `${owned.length} cards — select two to battle`
            : selected.length === 1
            ? `${slotA.card.displayName} ready — pick an opponent`
            : 'Click a card to swap it out'}
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 1400, margin: '0 auto' }}>
        {owned.map((oc, i) => (
          <BattleCard
            key={`${oc.card.imageId}-${i}`}
            card={oc.card}
            selected={selected.includes(oc)}
            serialNumber={oc.serialNumber}
            onClick={() => toggleSelect(oc)}
          />
        ))}
      </div>
    </div>
  );
}
