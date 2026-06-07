'use client';

import { useState } from 'react';
import { PACK_DEFS, PackDef, PackTier } from '@/lib/packTiers';

interface Props {
  onSelect: (tier: PackTier) => void;
}

export default function PackSelect({ onSelect }: Props) {
  const [hovered, setHovered] = useState<PackTier | null>(null);
  const [expanded, setExpanded] = useState<PackTier | null>(null);

  return (
    <div style={{ padding: '12px 0 0' }}>
      <p style={{
        textAlign: 'center', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.3em', color: '#3d2a50', textTransform: 'uppercase',
        marginBottom: 20,
      }}>
        Choose Your Pack · 10 Cards Each
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PACK_DEFS.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            isHovered={hovered === pack.id}
            isExpanded={expanded === pack.id}
            onHover={() => setHovered(pack.id)}
            onLeave={() => setHovered(null)}
            onToggleExpand={() => setExpanded(e => e === pack.id ? null : pack.id)}
            onOpen={() => onSelect(pack.id)}
          />
        ))}
      </div>

      <p style={{
        textAlign: 'center', fontSize: 8, color: '#2d1f40',
        letterSpacing: '0.1em', marginTop: 20, fontStyle: 'italic',
      }}>
        Prices in ETH · Payment required at mint · Smart contract coming soon
      </p>
    </div>
  );
}

function PackCard({
  pack, isHovered, isExpanded, onHover, onLeave, onToggleExpand, onOpen,
}: {
  pack: PackDef;
  isHovered: boolean;
  isExpanded: boolean;
  onHover: () => void;
  onLeave: () => void;
  onToggleExpand: () => void;
  onOpen: () => void;
}) {
  const isCodex = pack.id === 'codex';
  const isTablet = pack.id === 'tablet';

  return (
    <div
      style={{
        borderRadius: 16,
        background: pack.borderGradient,
        padding: 2,
        boxShadow: isHovered
          ? `0 0 32px ${pack.glow}, 0 8px 32px rgba(0,0,0,0.5)`
          : `0 0 12px ${pack.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
        transition: 'box-shadow 0.25s, transform 0.2s',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div style={{
        background: 'linear-gradient(160deg, #0e0520 0%, #070214 100%)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Main row */}
        <div
          style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}
          onClick={onToggleExpand}
        >
          {/* Pack art panel */}
          <div style={{
            width: 90, flexShrink: 0,
            background: pack.borderGradient,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '16px 12px',
            gap: 6,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Shimmer effect for Codex */}
            {isCodex && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                animation: 'shimmer 2.5s ease-in-out infinite',
              }} />
            )}
            <style>{`
              @keyframes shimmer { 0%,100% { opacity: 0.3 } 50% { opacity: 1 } }
              @keyframes float { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-3px) } }
            `}</style>
            <div style={{
              fontSize: 28,
              animation: isHovered ? 'float 1.8s ease-in-out infinite' : 'none',
            }}>
              {pack.id === 'scroll' ? '📜' : pack.id === 'tablet' ? '🗿' : '📕'}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '0.2em',
              color: pack.id === 'codex' ? '#000' : '#fff',
              textAlign: 'center', lineHeight: 1.2,
              textShadow: pack.id === 'codex' ? 'none' : '0 1px 3px rgba(0,0,0,0.5)',
            }}>
              {pack.name}
            </div>
            {/* Card count pips */}
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 60 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{
                  width: 4, height: 6, borderRadius: 1,
                  background: pack.id === 'codex'
                    ? 'rgba(0,0,0,0.4)'
                    : 'rgba(255,255,255,0.35)',
                }} />
              ))}
            </div>
          </div>

          {/* Info panel */}
          <div style={{ flex: 1, padding: '14px 14px 14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 900, color: pack.accentColor,
                  letterSpacing: '0.08em', lineHeight: 1.1,
                }}>
                  {pack.subtitle}
                </div>
                <div style={{ fontSize: 9, color: '#4a3d5c', marginTop: 2 }}>
                  {pack.flavour}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                <div style={{
                  fontSize: 17, fontWeight: 900, color: pack.accentColor,
                  letterSpacing: '0.02em', lineHeight: 1,
                }}>
                  Ξ{pack.priceEth}
                </div>
                <div style={{ fontSize: 8, color: '#3d2a50', marginTop: 1 }}>
                  ~${pack.priceUsdApprox}
                </div>
              </div>
            </div>

            {/* Guarantee badge */}
            {pack.guaranteeRarity && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 99, marginBottom: 8,
                background: `${pack.accentColor}18`,
                border: `1px solid ${pack.accentColor}40`,
              }}>
                <span style={{ fontSize: 9 }}>★</span>
                <span style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: '0.1em',
                  color: pack.accentColor, textTransform: 'uppercase',
                }}>
                  {pack.guaranteeRarity}+ Guaranteed
                </span>
              </div>
            )}

            {/* Top-3 odds preview */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {pack.odds.slice(0, 3).map(o => (
                <div key={o.label} style={{
                  fontSize: 8, padding: '1px 6px', borderRadius: 99,
                  background: `${o.color}15`,
                  border: `1px solid ${o.color}35`,
                  color: o.color, fontWeight: 700, letterSpacing: '0.05em',
                }}>
                  {o.pct} {o.label}
                </div>
              ))}
              <div
                style={{
                  fontSize: 8, padding: '1px 6px', borderRadius: 99,
                  background: 'rgba(138,99,210,0.08)',
                  border: '1px solid rgba(138,99,210,0.2)',
                  color: '#5c4070', cursor: 'pointer', fontWeight: 700,
                }}
              >
                {isExpanded ? '▲ less' : '▼ all odds'}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded odds table */}
        {isExpanded && (
          <div style={{
            borderTop: `1px solid ${pack.accentColor}20`,
            padding: '12px 14px',
          }}>
            <div style={{ marginBottom: 10 }}>
              {pack.odds.map(o => (
                <div key={o.label} style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                }}>
                  <div style={{
                    fontSize: 8, fontWeight: 700, width: 26, textAlign: 'right',
                    color: o.color, flexShrink: 0,
                  }}>
                    {o.pct}
                  </div>
                  <div style={{ flex: 1, height: 5, background: '#1a0f26', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${o.pctNum}%`,
                      background: `linear-gradient(90deg, ${o.color}, ${o.color}aa)`,
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{
                    fontSize: 8, color: '#5c4070', width: 90, flexShrink: 0,
                    letterSpacing: '0.05em',
                  }}>
                    {o.label}
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontSize: 8, color: '#3d2a50', margin: 0, fontStyle: 'italic',
              lineHeight: 1.5,
            }}>
              Per-card odds · 10 independent rolls per pack
              {pack.guaranteeRarity ? ` · Worst card upgraded to ${pack.guaranteeRarity} if none rolled` : ''}
            </p>
          </div>
        )}

        {/* Open button */}
        <div
          style={{ padding: '0 14px 14px', paddingTop: isExpanded ? 0 : 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onOpen}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: isCodex
                ? 'linear-gradient(90deg, #C9A84C, #8a1c3a, #C9A84C)'
                : isTablet
                  ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                  : 'linear-gradient(90deg, #4a3f2c, #8a7550)',
              color: isCodex ? '#000' : '#fff',
              fontSize: 11, fontWeight: 900, letterSpacing: '0.18em',
              textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: `0 0 16px ${pack.glow}`,
            }}
          >
            Open {pack.name} Pack · Ξ{pack.priceEth}
          </button>
        </div>
      </div>
    </div>
  );
}
