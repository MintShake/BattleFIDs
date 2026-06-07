'use client';

import { useState } from 'react';
import { BattleFIDCard, OwnedCard } from '@/types/card';
import { openPackRemote } from '@/lib/collection';
import { PackTier, PACK_DEFS } from '@/lib/packTiers';
import { estimateValue } from '@/lib/valuation';
import { isContractDeployed, ROYALTY_PCT } from '@/lib/contract';
import { useWallet } from '@/hooks/useWallet';
import BattleCard from './BattleCard';
import PackSelect from './PackSelect';
import WalletConnect from './WalletConnect';

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
  const [payError, setPayError]   = useState<string | null>(null);

  const wallet = useWallet();
  const cards: BattleFIDCard[] = owned.map((o) => o.card);
  const packDef = PACK_DEFS.find(p => p.id === chosenTier) ?? PACK_DEFS[0];
  const contractLive = isContractDeployed();

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
    setPayError(null);
    if (!contractLive) {
      // Demo mode — no payment taken
      await processOpen();
      return;
    }
    if (!wallet.connected) {
      setPayError('Connect your wallet first.');
      return;
    }
    // TODO: approve USDC spend + call buyPackOnChain() here
    // For now fall through to demo mode even when contract is live
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
      await sdk.actions.composeCast({ text: castText, embeds: ['https://battle-fids.vercel.app'] });
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
            background: 'none', border: 'none', color: '#5c4070',
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
                <div style={{ fontSize: 9, color: '#4a3d5c', marginTop: 1 }}>{packDef.subtitle} · 10 cards</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: packDef.accentColor, lineHeight: 1 }}>
                  ${packDef.priceUsdc}
                </div>
                <div style={{ fontSize: 8, color: '#3d2a50', marginTop: 1 }}>USDC</div>
              </div>
            </div>

            {/* Pack properties */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {packDef.guaranteeRarity && (
                <div style={{
                  fontSize: 8, padding: '3px 8px', borderRadius: 99, fontWeight: 700,
                  background: `${packDef.accentColor}14`, border: `1px solid ${packDef.accentColor}40`,
                  color: packDef.accentColor,
                }}>★ {packDef.guaranteeRarity}+ guaranteed</div>
              )}
              <div style={{
                fontSize: 8, padding: '3px 8px', borderRadius: 99, fontWeight: 700,
                background: 'rgba(138,99,210,0.08)', border: '1px solid rgba(138,99,210,0.2)',
                color: '#8a63d2',
              }}>
                Top {packDef.scorePercentile}% scored pulls
              </div>
              <div style={{
                fontSize: 8, padding: '3px 8px', borderRadius: 99, fontWeight: 700,
                background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
                color: '#C9A84C',
              }}>
                {ROYALTY_PCT}% creator royalty on resale
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

        {/* Wallet + payment section */}
        <div style={{
          borderRadius: 14, padding: '16px',
          background: 'rgba(138,99,210,0.04)',
          border: '1px solid rgba(138,99,210,0.15)',
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 8, fontWeight: 900, letterSpacing: '0.25em',
            color: '#3d2a50', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Payment
          </div>

          {contractLive ? (
            /* Live contract — real payment flow */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: '#5c4070' }}>Wallet</span>
                <WalletConnect compact />
              </div>
              {wallet.connected && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: '#5c4070' }}>You pay</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#f0eaf8' }}>
                    ${packDef.priceUsdc} USDC
                  </span>
                </div>
              )}
              {payError && (
                <p style={{ fontSize: 9, color: '#ef4444', margin: '0 0 10px' }}>{payError}</p>
              )}
              <button
                onClick={handlePayAndOpen}
                disabled={!wallet.connected}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                  background: wallet.connected
                    ? isCodex
                      ? 'linear-gradient(90deg, #C9A84C, #8a1c3a, #C9A84C)'
                      : isTablet
                        ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                        : 'linear-gradient(90deg, #4a3f2c, #8a7550)'
                    : '#1a0f26',
                  color: isCodex && wallet.connected ? '#000' : '#fff',
                  fontSize: 12, fontWeight: 900, letterSpacing: '0.15em',
                  textTransform: 'uppercase', cursor: wallet.connected ? 'pointer' : 'default',
                  opacity: wallet.connected ? 1 : 0.5,
                }}
              >
                {wallet.connected
                  ? `Pay $${packDef.priceUsdc} USDC · Open ${packDef.name}`
                  : 'Connect wallet to pay'}
              </button>
            </>
          ) : (
            /* Pre-launch — demo mode */
            <>
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 12px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', marginBottom: 2 }}>
                    Smart contract coming soon
                  </div>
                  <div style={{ fontSize: 9, color: '#5c4d50', lineHeight: 1.5 }}>
                    Pack opens are free in demo mode. USDC payment (${packDef.priceUsdc}) will be required
                    once the contract deploys on Base. NFT cards will be mintable at that point.
                  </div>
                </div>
              </div>
              {payError && (
                <p style={{ fontSize: 9, color: '#ef4444', margin: '0 0 10px' }}>{payError}</p>
              )}
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
                Open {packDef.name} · Demo
              </button>
            </>
          )}
        </div>

        <p style={{
          textAlign: 'center', fontSize: 8, color: '#2d1f40', fontStyle: 'italic',
          letterSpacing: '0.05em', lineHeight: 1.5,
        }}>
          Cards minted as ERC-1155 on Base · {ROYALTY_PCT}% royalty on all secondary sales
        </p>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Opening animation
  // ────────────────────────────────────────────────────────────────────────────

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
          Top {packDef.scorePercentile}% score pool · {packDef.odds.slice(0, 3).map(o => o.label).join(', ')}…
        </p>
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
        <p style={{ color: '#4a3d5c', fontSize: 11, marginBottom: 8 }}>
          {cards.length} cards from your {packDef.subtitle} saved.
        </p>
        <p style={{ color: '#3d2a50', fontSize: 9, marginBottom: 28, fontStyle: 'italic' }}>
          {contractLive
            ? `${cards.length} NFTs minted to your wallet · ${ROYALTY_PCT}% royalty on resale`
            : `Cards will be minted as NFTs automatically when the contract deploys on Base.`}
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
          <div style={{ fontSize: 8, color: '#3d2a50', letterSpacing: '0.15em', marginTop: 2 }}>
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
            {packDef.guaranteeRarity}+ guaranteed · Top {packDef.scorePercentile}% score pool
          </span>
        </div>
      )}

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
                  <div style={{ fontSize: 7, color: '#3d2a50', letterSpacing: '0.1em' }}>Tap to reveal</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
