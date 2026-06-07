'use client';

import Image from 'next/image';
import { BattleFIDCard, STAT_LABELS, STAT_ORDER, StatKey } from '@/types/card';

const RARITY_CONFIG = {
  Alpha: {
    border: 'linear-gradient(135deg, #FFD700, #FF6B6B, #b44fff, #00d4ff, #FFD700)',
    header: 'linear-gradient(160deg, #1a1000, #2a0800, #150820)',
    glow: '0 0 40px rgba(255,215,0,0.45), 0 0 80px rgba(180,79,255,0.2)',
    badge: { background: 'linear-gradient(90deg, #FFD700, #FF9500)', color: '#000' },
    bar: 'linear-gradient(90deg, #FFD700, #FF9500)',
    accent: '#FFD700',
  },
  Legendary: {
    border: 'linear-gradient(135deg, #b44fff, #6b21a8, #b44fff)',
    header: 'linear-gradient(160deg, #0f0020, #1a0040)',
    glow: '0 0 30px rgba(180,79,255,0.5)',
    badge: { background: 'linear-gradient(90deg, #b44fff, #7c3aed)', color: '#fff' },
    bar: 'linear-gradient(90deg, #b44fff, #7c3aed)',
    accent: '#b44fff',
  },
  Elite: {
    border: 'linear-gradient(135deg, #00d4ff, #0066ff)',
    header: 'linear-gradient(160deg, #001525, #001850)',
    glow: '0 0 25px rgba(0,212,255,0.4)',
    badge: { background: 'linear-gradient(90deg, #00d4ff, #0066ff)', color: '#000' },
    bar: 'linear-gradient(90deg, #00d4ff, #0066ff)',
    accent: '#00d4ff',
  },
  Rare: {
    border: 'linear-gradient(135deg, #00ff88, #00a854)',
    header: 'linear-gradient(160deg, #001a0e, #002818)',
    glow: '0 0 20px rgba(0,255,136,0.3)',
    badge: { background: 'linear-gradient(90deg, #00ff88, #00a854)', color: '#000' },
    bar: 'linear-gradient(90deg, #00ff88, #00a854)',
    accent: '#00ff88',
  },
  Common: {
    border: 'linear-gradient(135deg, #4b5563, #374151)',
    header: 'linear-gradient(160deg, #111827, #1f2937)',
    glow: 'none',
    badge: { background: '#374151', color: '#9ca3af' },
    bar: 'linear-gradient(90deg, #6b7280, #4b5563)',
    accent: '#6b7280',
  },
};

function editionLabel(variantIndex: number, totalVariants: number): string {
  if (totalVariants <= 1) return '';
  if (variantIndex === 0) return 'CURRENT';
  if (variantIndex === totalVariants - 1) return 'GENESIS';
  return `v${variantIndex + 1}`;
}

function formatSupply(fid: number): string {
  if (fid === 1) return '1 OF 1';
  if (fid <= 10) return `MAX ${fid}`;
  if (fid <= 1000) return `MAX ${fid}`;
  if (fid < 10000) return `MAX ${(fid / 1000).toFixed(1)}K`;
  return `MAX ${Math.round(fid / 1000)}K`;
}

interface Props {
  card: BattleFIDCard;
  selected?: boolean;
  compact?: boolean;
  highlightStat?: StatKey | null;
  onClick?: () => void;
  serialNumber?: number;
}

export default function BattleCard({
  card,
  selected,
  compact,
  highlightStat,
  onClick,
  serialNumber,
}: Props) {
  const cfg = RARITY_CONFIG[card.rarity];
  const w = compact ? 200 : 272;
  const edition = editionLabel(card.variantIndex, card.totalVariants);

  return (
    <div
      onClick={onClick}
      style={{
        background: cfg.border,
        padding: 2,
        borderRadius: 16,
        width: w,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        transform: selected ? 'scale(1.04)' : undefined,
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: selected
          ? `${cfg.glow !== 'none' ? cfg.glow + ', ' : ''}0 0 0 2px rgba(255,255,255,0.25)`
          : cfg.glow,
      }}
    >
      <div style={{ background: '#080e1a', borderRadius: 14, overflow: 'hidden' }}>
        {/* PFP image header */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: compact ? 140 : 180,
            background: cfg.header,
            overflow: 'hidden',
          }}
        >
          <Image
            src={card.pfpUrl}
            alt={card.displayName}
            fill
            style={{ objectFit: 'cover', opacity: 0.92 }}
            sizes={`${w}px`}
            unoptimized
          />

          {/* Top-left: supply */}
          <div
            style={{
              position: 'absolute', top: 8, left: 8,
              fontSize: 8, fontWeight: 900, letterSpacing: '0.12em',
              padding: '3px 7px', borderRadius: 99,
              background: 'rgba(0,0,0,0.65)',
              color: cfg.accent,
              border: `1px solid ${cfg.accent}44`,
            }}
          >
            {formatSupply(card.fid)}
          </div>

          {/* Top-right: FID */}
          <div
            style={{
              position: 'absolute', top: 8, right: 8,
              fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
              padding: '3px 7px', borderRadius: 99,
              background: 'rgba(0,0,0,0.65)',
              color: '#9ca3af',
            }}
          >
            FID #{card.fid}
          </div>

          {/* Bottom overlay: name + edition + rarity */}
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '20px 10px 8px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: compact ? 11 : 13, lineHeight: 1.2 }}>
                  {card.displayName}
                </div>
                <div style={{ color: '#6b7280', fontSize: 9, marginTop: 1 }}>@{card.handle}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                {edition && (
                  <div
                    style={{
                      fontSize: 7, fontWeight: 900, letterSpacing: '0.15em',
                      padding: '2px 6px', borderRadius: 4,
                      background: `${cfg.accent}22`,
                      color: cfg.accent, border: `1px solid ${cfg.accent}44`,
                    }}
                  >
                    {edition}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 8, fontWeight: 900, letterSpacing: '0.2em',
                    padding: '2px 7px', borderRadius: 99,
                    textTransform: 'uppercase',
                    ...cfg.badge,
                  }}
                >
                  {card.rarity}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${cfg.accent}33, transparent)` }} />

        {/* Stats */}
        <div style={{ padding: '10px 12px 8px' }}>
          {STAT_ORDER.map((key) => {
            const score = card.stats[key];
            const dimmed = highlightStat != null && highlightStat !== key;
            return (
              <div key={key} style={{ marginBottom: 7, opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: '#6b7280', textTransform: 'uppercase' }}>
                    {STAT_LABELS[key]}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: cfg.accent }}>{score}</span>
                </div>
                <div style={{ height: 4, background: '#111827', borderRadius: 99, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%', width: `${score}%`,
                      background: cfg.bar, borderRadius: 99,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Battle score + serial */}
        <div style={{ padding: '0 12px 12px' }}>
          <div
            style={{
              borderRadius: 10, padding: '7px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: `${cfg.accent}0d`, border: `1px solid ${cfg.accent}22`,
            }}
          >
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: '#4b5563', textTransform: 'uppercase' }}>
                Battle Score
              </div>
              {serialNumber !== undefined && (
                <div style={{ fontSize: 8, color: '#374151', marginTop: 1 }}>
                  #{serialNumber} / {card.fid === 1 ? '1' : card.fid.toLocaleString()}
                </div>
              )}
            </div>
            <span style={{ fontSize: compact ? 18 : 22, fontWeight: 900, color: cfg.accent }}>
              {card.battleScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
