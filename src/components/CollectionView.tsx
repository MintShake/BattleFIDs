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
        <div style={{
          margin: '0 auto 24px',
          borderRadius: 20, padding: '16px 12px',
          background: 'rgba(138,99,210,0.04)',
          border: '1px solid rgba(138,99,210,0.15)',
        }}>
          <div style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase', marginBottom: 16 }}>
            ⚔ Battle Arena ⚔
          </div>
          {/* Stat comparison — stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'start', maxWidth: 600, margin: '0 auto' }}>
            <div><BattleCard card={cardA} selected compact serialNumber={slotA.serialNumber} onClick={() => toggleSelect(slotA)} /></div>

            <div style={{ minWidth: 80, padding: '8px 0' }}>
              <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, color: '#6b5a80', marginBottom: 12 }}>VS</div>
              {STAT_ORDER.map((key: StatKey) => {
                const a = cardA.stats[key];
                const b = cardB.stats[key];
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 4 }}>
                    <span style={{ width: 24, textAlign: 'right', fontSize: 12, fontWeight: 900, color: a > b ? '#C9A84C' : '#6b5a80' }}>{a}</span>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: 6, fontWeight: 700, letterSpacing: '0.1em', color: '#7a6a90', textTransform: 'uppercase' }}>
                      {STAT_LABELS[key]}
                    </div>
                    <span style={{ width: 24, textAlign: 'left', fontSize: 12, fontWeight: 900, color: b > a ? '#C9A84C' : '#6b5a80' }}>{b}</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(138,99,210,0.12)', textAlign: 'center' }}>
                {winner ? (
                  <>
                    <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: '#7a6a90', textTransform: 'uppercase', marginBottom: 3 }}>Winner</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#C9A84C' }}>{winner.displayName}</div>
                    <div style={{ fontSize: 9, color: '#6b5a80', marginTop: 2 }}>
                      {Math.max(cardA.battleScore, cardB.battleScore)} vs {Math.min(cardA.battleScore, cardB.battleScore)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#C9A84C' }}>TIE</div>
                )}
              </div>
            </div>

            <div><BattleCard card={cardB} selected compact serialNumber={slotB.serialNumber} onClick={() => toggleSelect(slotB)} /></div>
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
      <div className="card-grid">
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
