'use client';

import { useState } from 'react';
import { PACK_DEFS, PackDef, PackTier } from '@/lib/packTiers';
import { RarityTier } from '@/types/card';

// ── Rarity display config ─────────────────────────────────────────────────────

const RARITY_CFG: Record<RarityTier, {
  border: string; accent: string; bar: string;
  tier: string; glow: string; header: string;
}> = {
  Alpha: {
    border:  'linear-gradient(135deg, #C9A84C, #8a1c3a, #C9A84C)',
    accent:  '#C9A84C',
    bar:     'linear-gradient(90deg, #C9A84C, #e8c870)',
    tier:    'IMPERATOR',
    glow:    'rgba(201,168,76,0.55)',
    header:  'linear-gradient(160deg, #1a0a00, #2a0a10)',
  },
  Legendary: {
    border:  'linear-gradient(135deg, #8a63d2, #5b21b6, #8a63d2)',
    accent:  '#8a63d2',
    bar:     'linear-gradient(90deg, #8a63d2, #a78bfa)',
    tier:    'SENATOR',
    glow:    'rgba(138,99,210,0.5)',
    header:  'linear-gradient(160deg, #0e0020, #1a0040)',
  },
  Elite: {
    border:  'linear-gradient(135deg, #cd7f32, #92531a, #cd7f32)',
    accent:  '#cd7f32',
    bar:     'linear-gradient(90deg, #cd7f32, #e8a050)',
    tier:    'CENTURION',
    glow:    'rgba(205,127,50,0.45)',
    header:  'linear-gradient(160deg, #150a00, #221200)',
  },
  Rare: {
    border:  'linear-gradient(135deg, #a78bfa, #7c3aed)',
    accent:  '#a78bfa',
    bar:     'linear-gradient(90deg, #a78bfa, #c4b5fd)',
    tier:    'LEGIONARY',
    glow:    'rgba(167,139,250,0.35)',
    header:  'linear-gradient(160deg, #0d0020, #18003a)',
  },
  Common: {
    border:  'linear-gradient(135deg, #6b5c3e, #4a3f2c)',
    accent:  '#8a7550',
    bar:     'linear-gradient(90deg, #8a7550, #a89060)',
    tier:    'CITIZEN',
    glow:    'rgba(138,117,80,0.2)',
    header:  'linear-gradient(160deg, #130f08, #1e1810)',
  },
};

// Fixed stat widths per rarity so renders are deterministic
const STAT_WIDTHS: Record<RarityTier, number[]> = {
  Alpha:     [95, 88, 90, 76, 82, 91, 0],
  Legendary: [80, 74, 80, 62, 70, 84, 0],
  Elite:     [63, 56, 68, 50, 58, 70, 0],
  Rare:      [46, 40, 52, 36, 44, 58, 0],
  Common:    [26, 22, 30, 18, 28, 40, 0],
};
const STAT_LABELS = ['SUPPLY', 'FOLLOWERS', 'NEYNAR', 'ACTIVITY', 'BADGES', 'PFP FRESH', 'XPLORA XP'];

// Preview rarities shown in each pack's card fan (index 0 = front/best)
const PREVIEW: Record<PackTier, RarityTier[]> = {
  scroll: ['Rare',      'Common',    'Common'   ],
  tablet: ['Elite',     'Rare',      'Rare'     ],
  codex:  ['Alpha',     'Legendary', 'Elite'    ],
};

// Fan transform per card position [front → back]
const FAN = [
  { rotate:  4, tx:   8, ty: -6, z: 3 },
  { rotate: -10, tx: -38, ty:  6, z: 2 },
  { rotate: 16, tx:  44, ty: 12, z: 1 },
];

// ── Mystery card ─────────────────────────────────────────────────────────────

function MysteryCard({ rarity }: { rarity: RarityTier }) {
  const cfg = RARITY_CFG[rarity];
  const widths = STAT_WIDTHS[rarity];

  return (
    <div style={{
      background: cfg.border,
      padding: 2, borderRadius: 14,
      width: 100, flexShrink: 0,
      boxShadow: `0 0 18px ${cfg.glow}, 0 4px 12px rgba(0,0,0,0.5)`,
    }}>
      <div style={{ background: '#09040f', borderRadius: 12, overflow: 'hidden' }}>

        {/* PFP area */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '1/1',
          background: cfg.header, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Arch vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 120% 160% at 50% 120%, transparent 40%, rgba(9,4,15,0.7) 100%)`,
            pointerEvents: 'none',
          }} />
          {/* Mystery circle */}
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: `${cfg.accent}18`,
            border: `2px solid ${cfg.accent}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 20, color: cfg.accent, fontWeight: 900, lineHeight: 1 }}>?</span>
          </div>

          {/* Supply badge */}
          <div style={{
            position: 'absolute', top: 6, left: 6,
            fontSize: 6, fontWeight: 900, letterSpacing: '0.1em',
            padding: '2px 5px', borderRadius: 99,
            background: 'rgba(0,0,0,0.75)', color: cfg.accent,
            border: `1px solid ${cfg.accent}40`,
          }}>???</div>

          {/* FID badge */}
          <div style={{
            position: 'absolute', top: 6, right: 6,
            fontSize: 6, fontWeight: 700,
            padding: '2px 5px', borderRadius: 99,
            background: 'rgba(0,0,0,0.75)', color: '#a08cc0',
          }}>FID #?</div>

          {/* Name overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '16px 7px 6px',
            background: 'linear-gradient(transparent, rgba(9,4,15,0.92))',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 3 }}>
              <div>
                <div style={{ color: '#f0eaf8', fontWeight: 700, fontSize: 8, lineHeight: 1.2 }}>??? ???</div>
                <div style={{ color: '#a08cc0', fontSize: 6, marginTop: 1 }}>@???</div>
              </div>
              <div style={{
                fontSize: 6, fontWeight: 900, letterSpacing: '0.12em',
                padding: '2px 5px', borderRadius: 99,
                background: cfg.border, color: rarity === 'Alpha' ? '#000' : '#fff',
              }}>
                {cfg.tier}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${cfg.accent}30, transparent)` }} />

        {/* Stats */}
        <div style={{ padding: '7px 8px 4px' }}>
          {STAT_LABELS.map((label, i) => (
            <div key={label} style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 5, fontWeight: 700, letterSpacing: '0.1em', color: '#6b5a80', textTransform: 'uppercase' }}>
                  {label}
                </span>
                <span style={{ fontSize: 6, fontWeight: 700, color: cfg.accent }}>??</span>
              </div>
              <div style={{ height: 2, background: '#1a0f26', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${widths[i]}%`,
                  background: cfg.bar, borderRadius: 99,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Battle score footer */}
        <div style={{ padding: '0 7px 7px' }}>
          <div style={{
            borderRadius: 8, padding: '5px 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `${cfg.accent}0c`, border: `1px solid ${cfg.accent}22`,
          }}>
            <div style={{ fontSize: 5, fontWeight: 700, letterSpacing: '0.2em', color: '#3d2050', textTransform: 'uppercase' }}>
              Battle Score
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: cfg.accent }}>??</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Card fan ─────────────────────────────────────────────────────────────────

function CardFan({ tier }: { tier: PackTier }) {
  const cards = PREVIEW[tier];
  return (
    <div style={{
      position: 'relative',
      height: 260,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginBottom: 6,
    }}>
      {cards.map((rarity, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: FAN[i].ty,
            left: '50%',
            transform: `translateX(calc(-50% + ${FAN[i].tx}px)) rotate(${FAN[i].rotate}deg)`,
            transformOrigin: 'bottom center',
            zIndex: FAN[i].z,
          }}
        >
          <MysteryCard rarity={rarity} />
        </div>
      ))}
    </div>
  );
}

// ── Pack card ─────────────────────────────────────────────────────────────────

function PackCard({ pack, onOpen }: { pack: PackDef; onOpen: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isCodex  = pack.id === 'codex';
  const isTablet = pack.id === 'tablet';

  return (
    <div style={{
      borderRadius: 18,
      background: pack.borderGradient,
      padding: 2,
      boxShadow: `0 0 20px ${pack.glow}, 0 6px 24px rgba(0,0,0,0.45)`,
    }}>
      <div style={{ background: 'linear-gradient(160deg, #0e0520 0%, #070214 100%)', borderRadius: 16, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '14px 16px 10px',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: pack.accentColor, letterSpacing: '0.1em' }}>
              {pack.name}
            </div>
            <div style={{ fontSize: 9, color: '#7a6a90', marginTop: 1 }}>{pack.subtitle}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: pack.accentColor, lineHeight: 1 }}>
              ${pack.priceUsdc}
            </div>
            <div style={{ fontSize: 8, color: '#6b5a80', marginTop: 1 }}>USDC</div>
          </div>
        </div>

        {/* Card fan */}
        <div style={{ padding: '0 16px' }}>
          <CardFan tier={pack.id} />
        </div>

        {/* Guarantee + odds */}
        <div style={{ padding: '0 14px 4px' }}>
          {pack.guaranteeRarity && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 99, marginBottom: 8,
              background: `${pack.accentColor}14`,
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

          {/* Odds pills row */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
            {pack.odds.slice(0, 4).map(o => (
              <div key={o.label} style={{
                fontSize: 7, padding: '1px 6px', borderRadius: 99,
                background: `${o.color}12`, border: `1px solid ${o.color}30`,
                color: o.color, fontWeight: 700,
              }}>
                {o.pct} {o.label.split(' ')[0]}
              </div>
            ))}
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                fontSize: 7, padding: '1px 6px', borderRadius: 99,
                background: 'rgba(138,99,210,0.08)', border: '1px solid rgba(138,99,210,0.2)',
                color: '#a08cc0', cursor: 'pointer', minHeight: 0,
              }}
            >
              {expanded ? '▲' : '▼ all'}
            </button>
          </div>

          {/* Expanded full odds bars */}
          {expanded && (
            <div style={{ marginBottom: 8 }}>
              {pack.odds.map(o => (
                <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ fontSize: 7, fontWeight: 700, width: 24, textAlign: 'right', color: o.color, flexShrink: 0 }}>
                    {o.pct}
                  </div>
                  <div style={{ flex: 1, height: 4, background: '#1a0f26', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${o.pctNum}%`,
                      background: `linear-gradient(90deg, ${o.color}, ${o.color}99)`, borderRadius: 99,
                    }} />
                  </div>
                  <div style={{ fontSize: 7, color: '#a08cc0', width: 80, flexShrink: 0 }}>{o.label}</div>
                </div>
              ))}
              <p style={{ fontSize: 7, color: '#6b5a80', margin: '4px 0 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                Per-card odds · 10 independent rolls
                {pack.guaranteeRarity ? ` · worst slot upgraded to ${pack.guaranteeRarity} if none rolled` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Open button */}
        <div style={{ padding: '4px 14px 14px' }}>
          <button
            onClick={onOpen}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
              background: isCodex
                ? 'linear-gradient(90deg, #C9A84C, #8a1c3a, #C9A84C)'
                : isTablet
                  ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                  : 'linear-gradient(90deg, #4a3f2c, #8a7550)',
              color: isCodex ? '#000' : '#fff',
              fontSize: 11, fontWeight: 900, letterSpacing: '0.18em',
              textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: `0 0 20px ${pack.glow}`,
            }}
          >
            Open {pack.name} · ${pack.priceUsdc} USDC
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PackSelect ────────────────────────────────────────────────────────────────

export default function PackSelect({ onSelect }: { onSelect: (tier: PackTier) => void }) {
  return (
    <div style={{ padding: '8px 0 0' }}>
      <p style={{
        textAlign: 'center', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.3em', color: '#6b5a80', textTransform: 'uppercase',
        marginBottom: 18,
      }}>
        Choose Your Pack · 10 Cards Each
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {PACK_DEFS.map(pack => (
          <PackCard key={pack.id} pack={pack} onOpen={() => onSelect(pack.id)} />
        ))}
      </div>

      <p style={{
        textAlign: 'center', fontSize: 8, color: '#6b5a80',
        letterSpacing: '0.1em', marginTop: 18, fontStyle: 'italic',
      }}>
        Prices in ETH · Payment required at mint · Smart contract coming soon
      </p>
    </div>
  );
}
