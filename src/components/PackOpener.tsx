'use client';

import { useState } from 'react';
import { BattleFIDCard, OwnedCard } from '@/types/card';
import { openPackRemote } from '@/lib/collection';
import { PackTier, PACK_DEFS } from '@/lib/packTiers';
import BattleCard from './BattleCard';
import PackSelect from './PackSelect';

type Phase = 'select' | 'opening' | 'revealing' | 'done';

export default function PackOpener({
  onCollected,
  ownerFid,
}: {
  onCollected?: () => void;
  ownerFid?: number;
}) {
  const [phase, setPhase] = useState<Phase>('select');
  const [chosenTier, setChosenTier] = useState<PackTier>('scroll');
  const [owned, setOwned] = useState<OwnedCard[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [revealAll, setRevealAll] = useState(false);

  const cards: BattleFIDCard[] = owned.map((o) => o.card);
  const packDef = PACK_DEFS.find(p => p.id === chosenTier) ?? PACK_DEFS[0];

  async function handleOpenPack(tier: PackTier) {
    setChosenTier(tier);
    setPhase('opening');
    setError(null);
    try {
      const pack = await openPackRemote(ownerFid, tier);
      setOwned(pack);
      setRevealed(new Set());
      setRevealAll(false);
      setPhase('revealing');
    } catch (e) {
      console.error(e);
      setError('Failed to open pack. Please try again.');
      setPhase('select');
    }
  }

  function revealCard(i: number) {
    setRevealed((prev) => new Set([...prev, i]));
  }

  function handleRevealAll() {
    setRevealAll(true);
    setRevealed(new Set(cards.map((_, i) => i)));
  }

  function handleCollect() {
    setPhase('done');
    onCollected?.();
  }

  function handleAgain() {
    setPhase('select');
    setOwned([]);
    setRevealed(new Set());
    setRevealAll(false);
  }

  // ── Pack selection ───────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <>
        <PackSelect onSelect={handleOpenPack} />
        {error && (
          <p style={{ color: '#ef4444', textAlign: 'center', marginTop: 16, fontSize: 11 }}>
            {error}
          </p>
        )}
      </>
    );
  }

  // ── Opening animation ────────────────────────────────────────────────────────
  if (phase === 'opening') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          background: packDef.borderGradient,
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{
          color: packDef.accentColor, fontSize: 11,
          letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700,
        }}>
          Opening {packDef.name} Pack…
        </p>
        <p style={{ color: '#3d2a50', fontSize: 9, marginTop: 6, letterSpacing: '0.15em' }}>
          Rolling the dice across {packDef.odds.slice(0, 3).map(o => o.label).join(', ')}…
        </p>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>
          {packDef.id === 'scroll' ? '📜' : packDef.id === 'tablet' ? '🗿' : '📕'}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 900, color: packDef.accentColor,
          letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase',
        }}>
          Added to Collection
        </div>
        <p style={{ color: '#4a3d5c', fontSize: 11, marginBottom: 28 }}>
          {cards.length} cards from your {packDef.subtitle} saved.
        </p>
        <button
          onClick={handleAgain}
          style={{
            padding: '12px 32px', borderRadius: 99,
            border: `1px solid ${packDef.accentColor}50`,
            cursor: 'pointer', background: 'transparent',
            color: packDef.accentColor, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          Open Another Pack
        </button>
      </div>
    );
  }

  // ── Revealing ────────────────────────────────────────────────────────────────
  const allRevealed = revealed.size === cards.length;

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 900, letterSpacing: '0.2em',
            color: packDef.accentColor, textTransform: 'uppercase',
          }}>
            {packDef.name} — {packDef.subtitle}
          </div>
          <div style={{
            fontSize: 8, color: '#3d2a50', letterSpacing: '0.15em', marginTop: 2,
          }}>
            {revealed.size} / {cards.length} revealed
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!allRevealed && (
            <button
              onClick={handleRevealAll}
              style={{
                padding: '8px 16px', borderRadius: 99,
                border: '1px solid rgba(138,99,210,0.2)',
                cursor: 'pointer', background: 'transparent',
                color: '#5c4070', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              Reveal All
            </button>
          )}
          {allRevealed && (
            <button
              onClick={handleCollect}
              style={{
                padding: '10px 22px', borderRadius: 99, border: 'none',
                cursor: 'pointer',
                background: packDef.id === 'codex'
                  ? 'linear-gradient(90deg, #C9A84C, #8a1c3a)'
                  : packDef.id === 'tablet'
                    ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                    : 'linear-gradient(90deg, #4a3f2c, #8a7550)',
                color: packDef.id === 'codex' ? '#000' : '#fff',
                fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                boxShadow: `0 0 16px ${packDef.glow}`,
              }}
            >
              Add to Collection
            </button>
          )}
        </div>
      </div>

      {/* Pack tier reminder strip */}
      {packDef.guaranteeRarity && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
          padding: '5px 12px', borderRadius: 8,
          background: `${packDef.accentColor}0c`,
          border: `1px solid ${packDef.accentColor}25`,
        }}>
          <span style={{ fontSize: 9 }}>★</span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
            color: packDef.accentColor, textTransform: 'uppercase',
          }}>
            {packDef.guaranteeRarity}+ guaranteed in this {packDef.name} pack
          </span>
        </div>
      )}

      {/* Card grid */}
      <div className="card-grid">
        {cards.map((card, i) => {
          const isRevealed = revealAll || revealed.has(i);
          return (
            <div
              key={i}
              onClick={() => !isRevealed && revealCard(i)}
              style={{ perspective: 1000, cursor: isRevealed ? 'default' : 'pointer' }}
            >
              <div style={{
                transition: 'transform 0.6s',
                transformStyle: 'preserve-3d',
                transform: isRevealed ? 'rotateY(0deg)' : 'rotateY(180deg)',
                position: 'relative', width: '100%',
              }}>
                {/* Front (revealed) */}
                <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                  <BattleCard card={card} compact serialNumber={owned[i]?.serialNumber} />
                </div>

                {/* Back (face-down) — themed per pack tier */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  minHeight: 300, borderRadius: 16,
                  background: `linear-gradient(145deg, #0e0520 0%, ${packDef.dimColor} 100%)`,
                  border: `2px solid ${packDef.accentColor}30`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 20px ${packDef.glow}`,
                  gap: 8,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${packDef.accentColor}30, ${packDef.accentColor}10)`,
                    border: `2px solid ${packDef.accentColor}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    ⚔
                  </div>
                  <div style={{
                    fontSize: 7, fontWeight: 900, letterSpacing: '0.3em',
                    color: packDef.accentColor, textTransform: 'uppercase', opacity: 0.7,
                  }}>
                    {packDef.name}
                  </div>
                  <div style={{ fontSize: 7, color: '#3d2a50', letterSpacing: '0.1em' }}>
                    Tap to reveal
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
