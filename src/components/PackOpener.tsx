'use client';

import { useState } from 'react';
import { BattleFIDCard, OwnedCard } from '@/types/card';
import { openPackRemote } from '@/lib/collection';
import BattleCard from './BattleCard';

type Phase = 'idle' | 'opening' | 'revealing' | 'done';

export default function PackOpener({
  onCollected,
  ownerFid,
}: {
  onCollected?: () => void;
  ownerFid?: number;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [owned, setOwned] = useState<OwnedCard[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [revealAll, setRevealAll] = useState(false);

  const cards: BattleFIDCard[] = owned.map((o) => o.card);

  async function handleOpenPack() {
    setPhase('opening');
    setError(null);
    try {
      const pack = await openPackRemote(ownerFid);
      setOwned(pack);
      setRevealed(new Set());
      setRevealAll(false);
      setPhase('revealing');
    } catch (e) {
      console.error(e);
      setError('Failed to open pack. Please try again.');
      setPhase('idle');
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
    // Cards are already persisted to Neon when the pack was opened
    setPhase('done');
    onCollected?.();
  }

  function handleAgain() {
    setPhase('idle');
    setOwned([]);
    setRevealed(new Set());
  }

  if (phase === 'idle') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', color: '#4b5563', textTransform: 'uppercase', marginBottom: 24 }}>
          Open a Card Pack
        </div>
        <p style={{ color: '#374151', fontSize: 12, marginBottom: 32, maxWidth: 340, margin: '0 auto 32px' }}>
          Each pack contains 10 random Battle FID cards drawn from the Faces database.
          Cards include PFP variants — rarer FIDs may appear.
        </p>
        <button
          onClick={handleOpenPack}
          style={{
            padding: '14px 40px', borderRadius: 99, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #00d4ff, #b44fff)',
            color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.15em',
            textTransform: 'uppercase',
            boxShadow: '0 0 30px rgba(0,212,255,0.3)',
          }}
        >
          Open Pack
        </button>
        {error && <p style={{ color: '#ef4444', marginTop: 16, fontSize: 12 }}>{error}</p>}
      </div>
    );
  }

  if (phase === 'opening') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #00d4ff, #b44fff)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#4b5563', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Drawing cards…
        </p>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#8a63d2', marginBottom: 12 }}>
          Added to Collection
        </div>
        <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 32 }}>
          {cards.length} cards saved to your collection.
        </p>
        <button
          onClick={handleAgain}
          style={{
            padding: '12px 32px', borderRadius: 99, border: '1px solid rgba(0,212,255,0.3)',
            cursor: 'pointer', background: 'transparent',
            color: '#00d4ff', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
          }}
        >
          Open Another Pack
        </button>
      </div>
    );
  }

  // revealing
  const allRevealed = revealed.size === cards.length;
  return (
    <div>
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, maxWidth: 1200, margin: '0 auto 24px',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#4b5563', textTransform: 'uppercase' }}>
          {revealed.size} / {cards.length} revealed
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {!allRevealed && (
            <button
              onClick={handleRevealAll}
              style={{
                padding: '8px 20px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', background: 'transparent',
                color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              }}
            >
              Reveal All
            </button>
          )}
          {allRevealed && (
            <button
              onClick={handleCollect}
              style={{
                padding: '10px 28px', borderRadius: 99, border: 'none',
                cursor: 'pointer', background: 'linear-gradient(90deg, #8a63d2, #6d28d9)',
                color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: '0.1em',
              }}
            >
              Add to Collection
            </button>
          )}
        </div>
      </div>

      <div className="card-grid">
        {cards.map((card, i) => {
          const isRevealed = revealAll || revealed.has(i);
          return (
            <div
              key={i}
              onClick={() => !isRevealed && revealCard(i)}
              style={{
                perspective: 1000,
                cursor: isRevealed ? 'default' : 'pointer',
              }}
            >
              <div
                style={{
                  transition: 'transform 0.6s',
                  transformStyle: 'preserve-3d',
                  transform: isRevealed ? 'rotateY(0deg)' : 'rotateY(180deg)',
                  position: 'relative',
                  width: '100%',
                }}
              >
                {/* Front (revealed) */}
                <div style={{ backfaceVisibility: 'hidden' }}>
                  <BattleCard card={card} compact />
                </div>

                {/* Back (face-down) */}
                <div
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    minHeight: 300, borderRadius: 16,
                    background: 'linear-gradient(135deg, #0e0520, #1a0a38)',
                    border: '2px solid rgba(138,99,210,0.25)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(138,99,210,0.15)',
                    gap: 8,
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(138,99,210,0.2), rgba(201,168,76,0.2))',
                    border: '2px solid rgba(138,99,210,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    ⚔
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#5c4070', textTransform: 'uppercase' }}>
                    Battle FIDs
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
