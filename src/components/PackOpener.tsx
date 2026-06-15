'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BattleFIDCard, OwnedCard } from '@/types/card';
import { openPackRemote } from '@/lib/collection';
import { PackTier, PACK_DEFS } from '@/lib/packTiers';
import { estimateValue } from '@/lib/valuation';
import BattleCard from './BattleCard';
import PackSelect from './PackSelect';

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const RARITY_COLORS: Record<string, string> = {
  Genesis:  '#C9A84C',
  Rare:     '#a78bfa',
  Uncommon: '#3a9bdc',
  Common:   '#7a6a90',
};

interface RecentPull {
  fid:          number;
  handle:       string;
  thumbUrl:     string;
  rarity:       string;
  ownerHandle:  string;
  openedAt:     string;
  isEdition1of1: boolean;
}

type Phase = 'select' | 'payment' | 'opening' | 'revealing' | 'done';

export default function PackOpener({
  onCollected,
  ownerFid,
  isInMiniApp,
}: {
  onCollected?: () => void;
  ownerFid?: number;
  isInMiniApp?: boolean;
}) {
  const [phase, setPhase]         = useState<Phase>('select');
  const [chosenTier, setChosenTier] = useState<PackTier>('scroll');
  const [owned, setOwned]         = useState<OwnedCard[]>([]);
  const [revealed, setRevealed]   = useState<Set<number>>(new Set());
  const [error, setError]         = useState<string | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const [recentPulls, setRecentPulls] = useState<RecentPull[]>([]);

  useEffect(() => {
    fetch('/api/browse?page=1&limit=20')
      .then(r => r.json())
      .then(data => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pulls: RecentPull[] = (data.cards ?? []).map((gc: any) => ({
          fid:           gc.ownedCard.card.fid,
          handle:        gc.ownedCard.card.handle,
          thumbUrl:      gc.ownedCard.card.thumbUrl,
          rarity:        gc.ownedCard.card.rarity,
          ownerHandle:   gc.ownerHandle ?? 'anon',
          openedAt:      gc.ownedCard.openedAt,
          isEdition1of1: gc.ownedCard.isEdition1of1 ?? false,
        }));
        setRecentPulls(pulls);
      })
      .catch(() => {});
  }, []);

  const cards: BattleFIDCard[] = owned.map((o) => o.card);
  const packDef = PACK_DEFS.find(p => p.id === chosenTier) ?? PACK_DEFS[0];

  // ── Step 1: pack selected → go to payment gate ───────────────────────────

  function handleSelectPack(tier: PackTier) {
    setChosenTier(tier);
    setPhase('payment');
  }

  // ── Step 2: payment confirmed → open pack ────────────────────────────────

  async function processOpen() {
    setPhase('opening');
    setError(null);
    try {
      const pack = await openPackRemote(ownerFid, chosenTier);
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

  async function handlePayAndOpen() {
    await processOpen();
  }

  // ── Card reveal helpers ───────────────────────────────────────────────────

  function revealCard(i: number) {
    setRevealed((prev) => new Set([...prev, i]));
  }

  function handleRevealAll() {
    setRevealAll(true);
    setRevealed(new Set(cards.map((_, i) => i)));
  }

  async function handleCollect() {
    setPhase('done');
    onCollected?.();

    if (!isInMiniApp) return;

    const top3 = [...owned]
      .sort((a, b) => estimateValue(b.card, b.serialNumber) - estimateValue(a.card, a.serialNumber))
      .slice(0, 3);

    const handles    = top3.map(o => `@${o.card.handle}`).join(', ');
    const rest       = owned.length - top3.length;
    const rarityLabel = top3[0] ? `${top3[0].card.rarity} · FID #${top3[0].card.fid}` : '';

    const castText = [
      `Just opened a ${packDef.name} pack from The Protocol ⚔`,
      '',
      `Got ${handles}${rest > 0 ? ` + ${rest} more` : ''}`,
      rarityLabel ? `Top pull: ${rarityLabel}` : '',
      '',
      'Farcaster identity cards · MMXXVI',
    ].filter(l => l !== undefined).join('\n').trim();

    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      await sdk.actions.composeCast({ text: castText, embeds: ['https://the-protocol-xi.vercel.app'] });
    } catch {
      // user dismissed
    }
  }

  function handleAgain() {
    setPhase('select');
    setOwned([]);
    setRevealed(new Set());
    setRevealAll(false);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Select
  // ────────────────────────────────────────────────────────────────────────────

  if (phase === 'select') {
    return (
      <>
        <PackSelect onSelect={handleSelectPack} />
        {error && (
          <p style={{ color: '#ef4444', textAlign: 'center', marginTop: 16, fontSize: 11 }}>
            {error}
          </p>
        )}

        {/* Global pull history */}
        {recentPulls.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(138,99,210,0.12)' }} />
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase' }}>
                ◆ Recent Pulls
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(138,99,210,0.12)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentPulls.map((pull, i) => {
                const rarityColor = RARITY_COLORS[pull.rarity] ?? '#7a6a90';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10,
                    background: pull.isEdition1of1
                      ? 'rgba(201,168,76,0.05)'
                      : 'rgba(138,99,210,0.04)',
                    border: pull.isEdition1of1
                      ? '1px solid rgba(201,168,76,0.2)'
                      : '1px solid rgba(138,99,210,0.08)',
                  }}>
                    {/* Thumb */}
                    <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: `1px solid ${rarityColor}30` }}>
                      <Image src={pull.thumbUrl} alt={pull.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>

                    {/* Card info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#e0d4f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          @{pull.handle}
                        </span>
                        {pull.isEdition1of1 && (
                          <span style={{ fontSize: 7, fontWeight: 900, color: '#C9A84C', letterSpacing: '0.1em', flexShrink: 0 }}>✦ 1/1</span>
                        )}
                      </div>
                      <div style={{ fontSize: 8, color: '#5a4a70' }}>
                        by {pull.ownerHandle === 'anon' ? 'anon' : `@${pull.ownerHandle}`} · {timeAgo(pull.openedAt)}
                      </div>
                    </div>

                    {/* Rarity */}
                    <div style={{
                      fontSize: 7, fontWeight: 900, letterSpacing: '0.12em',
                      padding: '2px 7px', borderRadius: 99, flexShrink: 0,
                      background: `${rarityColor}12`,
                      border: `1px solid ${rarityColor}30`,
                      color: rarityColor,
                      textTransform: 'uppercase',
                    }}>
                      {pull.rarity}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Payment gate
  // ────────────────────────────────────────────────────────────────────────────

  if (phase === 'payment') {
    const isCodex  = packDef.id === 'codex';
    const isTablet = packDef.id === 'tablet';

    return (
      <div style={{ padding: '8px 0' }}>
        {/* Back */}
        <button
          onClick={() => setPhase('select')}
          style={{
            background: 'none', border: 'none', color: '#a08cc0',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
            cursor: 'pointer', marginBottom: 20, padding: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Back to packs
        </button>

        {/* Pack summary card */}
        <div style={{
          borderRadius: 16, padding: 2,
          background: packDef.borderGradient,
          boxShadow: `0 0 24px ${packDef.glow}`,
          marginBottom: 20,
        }}>
          <div style={{ background: '#09040f', borderRadius: 14, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: packDef.accentColor, letterSpacing: '0.1em' }}>
                  {packDef.name}
                </div>
                <div style={{ fontSize: 9, color: '#7a6a90', marginTop: 1 }}>{packDef.subtitle} · 10 cards</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: packDef.accentColor, lineHeight: 1 }}>
                  ${packDef.priceUsdc}
                </div>
                <div style={{ fontSize: 8, color: '#6b5a80', marginTop: 1 }}>USDC</div>
              </div>
            </div>

            {/* Pack properties */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{
                fontSize: 8, padding: '3px 8px', borderRadius: 99, fontWeight: 700,
                background: 'rgba(138,99,210,0.08)', border: '1px solid rgba(138,99,210,0.2)',
                color: '#8a63d2',
              }}>
                {packDef.bands.length > 1 ? packDef.bands.filter(b => b.pctTo <= 50).map(b => `${b.count}× top ${b.pctTo}%`).join(' · ') : 'Full random pool'}
              </div>
            </div>

            {/* Odds summary */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {packDef.odds.map(o => (
                <div key={o.label} style={{
                  fontSize: 7, padding: '1px 6px', borderRadius: 99,
                  background: `${o.color}10`, border: `1px solid ${o.color}28`,
                  color: o.color, fontWeight: 700,
                }}>
                  {o.pct} {o.label.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handlePayAndOpen}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
            background: isCodex
              ? 'linear-gradient(90deg, #C9A84C, #8a1c3a, #C9A84C)'
              : isTablet
                ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                : 'linear-gradient(90deg, #4a3f2c, #8a7550)',
            color: isCodex ? '#000' : '#fff',
            fontSize: 12, fontWeight: 900, letterSpacing: '0.15em',
            textTransform: 'uppercase', cursor: 'pointer',
            boxShadow: `0 0 20px ${packDef.glow}`,
          }}
        >
          Open {packDef.name}
        </button>

        <div style={{
          marginTop: 10, padding: '9px 12px', borderRadius: 10,
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.2)',
          color: '#22c55e',
          fontSize: 8,
          lineHeight: 1.55,
          textAlign: 'center',
        }}>
          Simulation only: no wallet opens and no payment is taken. Opening a pack awards Protocol Points for this test flow.
        </div>

        <p style={{
          fontSize: 8, color: '#4a3a5a', textAlign: 'center',
          marginTop: 12, lineHeight: 1.65, margin: '12px 0 0',
        }}>
          Cards display the live Farcaster profile photo for each FID. Images are sourced from the Faces community app and may change at any time. The Protocol is not affiliated with any depicted individual. To report an image, open any card and tap ⚑ Report. FID holders may opt out their photos via their Profile tab.
        </p>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Opening animation
  // ────────────────────────────────────────────────────────────────────────────

  if (phase === 'opening') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        background: 'rgba(7, 4, 14, 0.72)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          width: 'min(92vw, 340px)',
          borderRadius: 8,
          padding: '28px 22px 24px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(20,15,31,0.98), rgba(12,8,20,0.98))',
          border: `1px solid ${packDef.accentColor}`,
          boxShadow: `0 0 34px ${packDef.glow}`,
        }}>
          <div style={{
            position: 'relative',
            width: 112,
            height: 150,
            margin: '0 auto 22px',
            transformStyle: 'preserve-3d',
            animation: 'packShake 1.15s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 8,
              background: packDef.borderGradient,
              opacity: 0.95,
              boxShadow: `0 0 24px ${packDef.glow}`,
            }} />
            <div style={{
              position: 'absolute',
              inset: 5,
              borderRadius: 6,
              background: '#0b0713',
              border: '1px solid rgba(255,255,255,0.16)',
              display: 'grid',
              placeItems: 'center',
              color: packDef.accentColor,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 0,
            }}>
              {packDef.id === 'scroll' ? 'S' : packDef.id === 'tablet' ? 'T' : 'C'}
            </div>
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 138,
              height: 138,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              border: `1px solid ${packDef.accentColor}`,
              opacity: 0.42,
              animation: 'packPulse 1.15s ease-out infinite',
            }} />
          </div>
          <style>{`
            @keyframes packShake {
              0%, 100% { transform: rotate(-2deg) translateY(0); }
              30% { transform: rotate(3deg) translateY(-5px); }
              62% { transform: rotate(-1deg) translateY(3px); }
            }
            @keyframes packPulse {
              0% { transform: translate(-50%, -50%) scale(0.76); opacity: 0.52; }
              100% { transform: translate(-50%, -50%) scale(1.16); opacity: 0; }
            }
          `}</style>
          <p style={{
            color: packDef.accentColor, fontSize: 11,
            letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800,
            margin: 0,
          }}>
            Opening {packDef.name} Pack
          </p>
          <p style={{ color: '#8f7ba8', fontSize: 9, margin: '8px 0 0', letterSpacing: '0.08em', lineHeight: 1.6 }}>
            Drawing 10 cards · {packDef.bands.length > 1 ? packDef.bands.map(b => `${b.count}x ${b.pctTo <= 25 ? `top ${b.pctTo}%` : b.pctFrom >= 50 ? 'random' : `${b.pctFrom}-${b.pctTo}%`}`).join(' · ') : 'full registry'}
          </p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Done
  // ────────────────────────────────────────────────────────────────────────────

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
        <p style={{ color: '#7a6a90', fontSize: 11, marginBottom: 8 }}>
          {cards.length} cards from your {packDef.subtitle} saved.
        </p>
        <p style={{ color: '#6b5a80', fontSize: 9, marginBottom: 28, fontStyle: 'italic' }}>
          {cards.length} cards added to your collection
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

  // ────────────────────────────────────────────────────────────────────────────
  // Revealing
  // ────────────────────────────────────────────────────────────────────────────

  const allRevealed = revealed.size === cards.length;

  return (
    <div>
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
          <div style={{ fontSize: 8, color: '#6b5a80', letterSpacing: '0.15em', marginTop: 2 }}>
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
                color: '#a08cc0', fontSize: 9, fontWeight: 700,
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
                <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                  <BattleCard card={card} compact serialNumber={owned[i]?.serialNumber} />
                </div>
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
                  }}>⚔</div>
                  <div style={{
                    fontSize: 7, fontWeight: 900, letterSpacing: '0.3em',
                    color: packDef.accentColor, textTransform: 'uppercase', opacity: 0.7,
                  }}>{packDef.name}</div>
                  <div style={{ fontSize: 7, color: '#6b5a80', letterSpacing: '0.1em' }}>Tap to reveal</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
