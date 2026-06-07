'use client';

import Image from 'next/image';
import { BattleFIDCard, STAT_LABELS, STAT_ORDER, StatKey, CARD_TYPE_LABELS } from '@/types/card';
import { computeBadges } from '@/lib/badges';
import { BADGE_COLORS, BadgeRarity } from '@/types/badge';
import { cardValue } from '@/lib/valuation';

// ── Rarity configs — Roman · Farcaster theme ──────────────────────────────────

const RARITY_CONFIG = {
  Alpha: {
    // Imperator — Imperial gold + crimson, holographic
    border: 'linear-gradient(135deg, #C9A84C, #8a1c3a, #C9A84C, #8a63d2, #C9A84C)',
    header: 'linear-gradient(160deg, #1a0a00, #2a0a10, #100018)',
    glow: '0 0 50px rgba(201,168,76,0.5), 0 0 100px rgba(138,99,210,0.2)',
    badge: { background: 'linear-gradient(90deg, #C9A84C, #a07830)', color: '#000' },
    bar: 'linear-gradient(90deg, #C9A84C, #e8c870)',
    accent: '#C9A84C',
    tier: 'IMPERATOR',
  },
  Legendary: {
    // Senator — Farcaster deep purple
    border: 'linear-gradient(135deg, #8a63d2, #5b21b6, #8a63d2)',
    header: 'linear-gradient(160deg, #0e0020, #1a0040, #0e0020)',
    glow: '0 0 35px rgba(138,99,210,0.55)',
    badge: { background: 'linear-gradient(90deg, #8a63d2, #6d28d9)', color: '#fff' },
    bar: 'linear-gradient(90deg, #8a63d2, #a78bfa)',
    accent: '#8a63d2',
    tier: 'SENATOR',
  },
  Elite: {
    // Centurion — Roman bronze
    border: 'linear-gradient(135deg, #cd7f32, #92531a, #cd7f32)',
    header: 'linear-gradient(160deg, #150a00, #221200)',
    glow: '0 0 28px rgba(205,127,50,0.45)',
    badge: { background: 'linear-gradient(90deg, #cd7f32, #a06020)', color: '#fff' },
    bar: 'linear-gradient(90deg, #cd7f32, #e8a050)',
    accent: '#cd7f32',
    tier: 'CENTURION',
  },
  Rare: {
    // Legionary — amethyst violet
    border: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    header: 'linear-gradient(160deg, #0d0020, #18003a)',
    glow: '0 0 20px rgba(167,139,250,0.35)',
    badge: { background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', color: '#fff' },
    bar: 'linear-gradient(90deg, #a78bfa, #c4b5fd)',
    accent: '#a78bfa',
    tier: 'LEGIONARY',
  },
  Common: {
    // Citizen — sandstone
    border: 'linear-gradient(135deg, #6b5c3e, #4a3f2c)',
    header: 'linear-gradient(160deg, #130f08, #1e1810)',
    glow: 'none',
    badge: { background: '#3d3020', color: '#a8956a' },
    bar: 'linear-gradient(90deg, #8a7550, #a89060)',
    accent: '#8a7550',
    tier: 'CITIZEN',
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
  ownerHandle?: string;
  showFollow?: boolean; // renders follow + W/L — omit for NFT image-only contexts
}

export default function BattleCard({
  card,
  selected,
  compact,
  highlightStat,
  onClick,
  serialNumber,
  ownerHandle,
  showFollow = true,
}: Props) {
  const cfg = RARITY_CONFIG[card.rarity];
  const edition = editionLabel(card.variantIndex, card.totalVariants);

  return (
    <div
      onClick={onClick}
      style={{
        background: cfg.border,
        padding: 2,
        borderRadius: 18,
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transform: selected ? 'scale(1.04)' : undefined,
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: selected
          ? `${cfg.glow !== 'none' ? cfg.glow + ', ' : ''}0 0 0 2px rgba(255,255,255,0.2)`
          : cfg.glow,
      }}
    >
      <div style={{ background: '#09040f', borderRadius: 16, overflow: 'hidden' }}>

        {/* PFP image + arch overlay */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: compact ? '4/3' : '1/1',
            background: cfg.header,
            overflow: 'hidden',
          }}
        >
          <Image
            src={card.pfpUrl}
            alt={card.displayName}
            fill
            style={{ objectFit: 'cover', opacity: 0.9 }}
            sizes="(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 300px"
            unoptimized
          />

          {/* Roman arch vignette */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse 120% 160% at 50% 120%, transparent 40%, rgba(9,4,15,0.7) 100%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Arch shape at top */}
          <div
            style={{
              position: 'absolute', top: -1, left: '15%', right: '15%', height: '60%',
              borderRadius: '0 0 100% 100%',
              border: `1px solid ${cfg.accent}30`,
              borderTop: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* Top-left: supply */}
          <div style={{
            position: 'absolute', top: 8, left: 8,
            fontSize: 8, fontWeight: 900, letterSpacing: '0.12em',
            padding: '3px 7px', borderRadius: 99,
            background: 'rgba(0,0,0,0.7)',
            color: cfg.accent,
            border: `1px solid ${cfg.accent}40`,
          }}>
            {formatSupply(card.fid)}
          </div>

          {/* Top-right: FID */}
          <div style={{
            position: 'absolute', top: 8, right: 8,
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
            padding: '3px 7px', borderRadius: 99,
            background: 'rgba(0,0,0,0.7)',
            color: '#7c6a96',
          }}>
            FID #{card.fid}
          </div>

          {/* Bottom overlay: name + rarity */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '28px 10px 8px',
            background: 'linear-gradient(transparent, rgba(9,4,15,0.92))',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
              <div>
                <div style={{ color: '#f0eaf8', fontWeight: 700, fontSize: compact ? 11 : 13, lineHeight: 1.2 }}>
                  {card.displayName}
                </div>
                <div style={{ color: '#5c4d70', fontSize: 9, marginTop: 1 }}>@{card.handle}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                {edition && (
                  <div style={{
                    fontSize: 7, fontWeight: 900, letterSpacing: '0.15em',
                    padding: '2px 6px', borderRadius: 4,
                    background: `${cfg.accent}20`,
                    color: cfg.accent,
                    border: `1px solid ${cfg.accent}40`,
                  }}>
                    {edition}
                  </div>
                )}
                <div style={{
                  fontSize: 7, fontWeight: 900, letterSpacing: '0.2em',
                  padding: '2px 7px', borderRadius: 99,
                  textTransform: 'uppercase',
                  ...cfg.badge,
                }}>
                  {cfg.tier}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column divider */}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${cfg.accent}40, transparent)`,
        }} />

        {/* Stats */}
        <div style={{ padding: '10px 12px 6px' }}>
          {STAT_ORDER.map((key) => {
            const score = card.stats[key];
            const dimmed = highlightStat != null && highlightStat !== key;
            return (
              <div key={key} style={{ marginBottom: 7, opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: '#5c4d70', textTransform: 'uppercase' }}>
                    {STAT_LABELS[key]}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: cfg.accent }}>{score}</span>
                </div>
                <div style={{ height: 3, background: '#1a0f26', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${score}%`,
                    background: cfg.bar, borderRadius: 99,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Badges + community meta */}
        <div style={{ padding: '4px 12px 6px' }}>
          {/* Badge chips */}
          {(() => {
            const badges = computeBadges(card);
            return badges.length > 0 ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
                {badges.slice(0, 3).map(b => (
                  <span key={b.id} style={{
                    fontSize: 8, padding: '2px 6px', borderRadius: 99, fontWeight: 700,
                    letterSpacing: '0.08em',
                    background: BADGE_COLORS[b.rarity as BadgeRarity].bg,
                    color: BADGE_COLORS[b.rarity as BadgeRarity].color,
                    border: `1px solid ${BADGE_COLORS[b.rarity as BadgeRarity].border}`,
                  }}>
                    {b.emoji} {b.name}
                  </span>
                ))}
                {badges.length > 3 && (
                  <span style={{ fontSize: 8, color: '#4a3d5c', padding: '2px 4px' }}>+{badges.length - 3}</span>
                )}
              </div>
            ) : null;
          })()}
          {/* Faces community row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#4a3d5c' }}>❤ {card.likeCount.toLocaleString()}</span>
            <span style={{ fontSize: 9, color: '#4a3d5c' }}>🖼 {card.totalVariants} PFP{card.totalVariants !== 1 ? 's' : ''}</span>
            <span style={{
              fontSize: 7, color: '#8a63d2', marginLeft: 'auto',
              fontWeight: 700, letterSpacing: '0.08em',
              padding: '1px 5px', borderRadius: 4,
              background: 'rgba(138,99,210,0.08)',
              border: '1px solid rgba(138,99,210,0.2)',
            }}>
              via Faces
            </span>
          </div>
        </div>

        {/* Battle score + est. value footer */}
        <div style={{ padding: '0 10px 10px' }}>

          {/* Owner chip — shown on browse view */}
          {ownerHandle && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              marginBottom: 6, padding: '4px 8px', borderRadius: 8,
              background: 'rgba(138,99,210,0.07)',
              border: '1px solid rgba(138,99,210,0.18)',
            }}>
              <span style={{ fontSize: 8, color: '#4a3d5c', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                Owned by
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: ownerHandle === 'anon' ? '#3d2a50' : '#8a63d2',
                fontStyle: ownerHandle === 'anon' ? 'italic' : 'normal',
              }}>
                {ownerHandle === 'anon' ? 'anon' : `@${ownerHandle}`}
              </span>
            </div>
          )}

          <div style={{
            borderRadius: 10, padding: '7px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `${cfg.accent}0c`,
            border: `1px solid ${cfg.accent}25`,
          }}>
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.25em', color: '#3d3050', textTransform: 'uppercase' }}>
                Battle Score
              </div>
              {serialNumber !== undefined && (
                <div style={{ fontSize: 8, color: '#3d3050', marginTop: 1 }}>
                  #{serialNumber} / {card.fid.toLocaleString()}
                </div>
              )}
            </div>
            <span style={{ fontSize: compact ? 18 : 24, fontWeight: 900, color: cfg.accent }}>
              {card.battleScore}
            </span>
          </div>

          {/* Estimated value strip */}
          <div style={{
            marginTop: 5, borderRadius: 8, padding: '5px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.2)',
          }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: '#5c4030', textTransform: 'uppercase' }}>
              Est. Value
            </div>
            <div style={{ fontSize: compact ? 11 : 13, fontWeight: 900, color: '#C9A84C', letterSpacing: '0.05em' }}>
              {cardValue(card, serialNumber)}
            </div>
          </div>

          {/* Type badge + W/L + Follow — shown in app, not in NFT metadata */}
          {showFollow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
              {/* Card type */}
              <div style={{
                fontSize: 7, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: 99,
                background: `${cfg.accent}15`, border: `1px solid ${cfg.accent}30`, color: cfg.accent,
              }}>
                {CARD_TYPE_LABELS[card.cardType]}
              </div>

              {/* W/L record */}
              {(card.wins > 0 || card.losses > 0) && (
                <div style={{
                  fontSize: 7, fontWeight: 700, letterSpacing: '0.1em',
                  padding: '2px 7px', borderRadius: 99,
                  background: 'rgba(138,99,210,0.08)', border: '1px solid rgba(138,99,210,0.2)',
                  color: '#7c6a96',
                }}>
                  {card.wins}W {card.losses}L
                </div>
              )}

              {/* Follow button — links to Warpcast profile */}
              <a
                href={`https://warpcast.com/${card.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  marginLeft: 'auto',
                  fontSize: 7, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 99,
                  background: 'rgba(138,99,210,0.12)', border: '1px solid rgba(138,99,210,0.3)',
                  color: '#8a63d2', textDecoration: 'none', display: 'inline-block',
                }}
              >
                Follow ↗
              </a>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
