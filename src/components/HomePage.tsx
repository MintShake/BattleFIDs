'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useEdition } from '@/editions/context';

interface HomeStats {
  totalCards:   number;
  totalPlayers: number;
  weekTeams:    number;
  topCard: {
    fid:         number;
    handle:      string;
    displayName: string;
    thumbUrl:    string;
    battleScore: number;
    rarity:      string;
  } | null;
  lastWinners: Array<{
    ownerFid:   number | null;
    handle:     string | null;
    slotPoints: number;
    weekId:     string;
    tier:       string;
  }>;
  topPlayers: Array<{
    ownerFid:       number;
    protocolPoints: number;
    handle:         string;
  }>;
  currentWeekId: string;
}

const RARITY_COLOR: Record<string, string> = {
  Genesis: '#C9A84C', Rare: '#a78bfa', Uncommon: '#3a9bdc', Common: '#7a6a90',
};

const STEPS = [
  {
    n: '01', title: 'Open Packs',
    body: 'Each pack contains 10 Farcaster identity cards. Cards display live profile photos and track real on-chain activity — follower growth, casts, likes, and more.',
  },
  {
    n: '02', title: 'Build Your Team',
    body: 'Pick 5 cards for the week — one per slot: Casts · Replies · Followers · Score Rise · Likes. Each slot competes head-to-head on that exact metric against every other player in your tier.',
  },
  {
    n: '03', title: 'Earn Points',
    body: '1 point per opponent beaten per slot. Finish in the top half of your group and earn a 50-point overall-win bonus. Use a rare FID ≤ 100 card and earn 25 more. Points stack across every week.',
  },
  {
    n: '04', title: 'Rise Through Tiers',
    body: 'Enter as Beginner, or roll the dice with Confident — a 50/50 bracket reveal at lock time (Beginner or Pro). Reach the 90th percentile avg team score and you\'re locked into Pro permanently.',
  },
];

interface Props {
  ownerFid?:           number;
  totalOwned:          number;
  onGoToPacks:         () => void;
  onGoToLeague:        () => void;
  onGoToLeaderboard:   () => void;
  onGoToCards:         () => void;
  onGoToBrowse:        () => void;
}

export default function HomePage({
  totalOwned,
  onGoToPacks,
  onGoToLeague,
  onGoToLeaderboard,
  onGoToCards,
  onGoToBrowse,
}: Props) {
  const edition = useEdition();
  const [stats, setStats]       = useState<HomeStats | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);

  useEffect(() => {
    fetch('/api/home/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const accent  = edition.theme.accentPrimary;
  const purple  = '#8a63d2';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', marginBottom: 18,
        borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(138,99,210,0.15)',
        background: 'rgba(138,99,210,0.04)',
      }}>
        {[
          { label: 'In Circulation', value: stats ? stats.totalCards.toLocaleString() : '…' },
          { label: 'Players',        value: stats ? stats.totalPlayers.toLocaleString() : '…' },
          { label: 'This Week',      value: stats ? stats.weekTeams.toLocaleString() : '…' },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, textAlign: 'center', padding: '13px 6px',
            borderLeft: i > 0 ? '1px solid rgba(138,99,210,0.1)' : 'none',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', color: '#5a4a70', textTransform: 'uppercase', marginTop: 4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Last week's champion ─────────────────────────────────────────────── */}
      {stats?.lastWinners && stats.lastWinners.length > 0 && (
        <div style={{
          borderRadius: 14, padding: '12px 14px', marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(138,99,210,0.05) 100%)',
          border: '1px solid rgba(201,168,76,0.22)',
        }}>
          <div style={{
            fontSize: 7, fontWeight: 900, letterSpacing: '0.3em',
            color: '#C9A84C', textTransform: 'uppercase', marginBottom: 10,
          }}>
            ★ Last Week&apos;s Champion · {stats.lastWinners[0].weekId}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.lastWinners.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? 'rgba(201,168,76,0.18)' : 'rgba(138,99,210,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {i === 0 ? '🥇' : '🥈'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#f0eaf8', lineHeight: 1.1 }}>
                    {w.handle ? `@${w.handle}` : `FID #${w.ownerFid}`}
                  </div>
                  <div style={{ fontSize: 8, color: '#a08cc0', marginTop: 2 }}>
                    {w.slotPoints} slot pts · {w.tier === 'pro' ? '★ Pro' : w.tier === 'confident' ? '⚡ Confident' : '◎ Beginner'}
                  </div>
                </div>
                <div style={{
                  fontSize: 7, padding: '3px 9px', borderRadius: 99,
                  background: i === 0 ? 'rgba(201,168,76,0.12)' : 'rgba(138,99,210,0.1)',
                  border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.3)' : 'rgba(138,99,210,0.25)'}`,
                  color: i === 0 ? '#C9A84C' : '#a08cc0', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {w.tier === 'pro' ? 'PRO' : 'BEGINNER'} #1
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top card + Open packs CTA ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>

        {/* Top rated card */}
        {stats?.topCard && (() => {
          const rc = RARITY_COLOR[stats.topCard.rarity] ?? '#7a6a90';
          return (
            <div style={{
              width: 100, flexShrink: 0, borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${rc}30`,
              background: 'rgba(138,99,210,0.04)',
            }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <Image src={stats.topCard.thumbUrl} alt={stats.topCard.handle} fill style={{ objectFit: 'cover' }} unoptimized />
                {/* gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 50%, rgba(9,4,15,0.85) 100%)',
                }} />
                {/* rarity badge */}
                <div style={{
                  position: 'absolute', top: 5, left: 5,
                  fontSize: 6, fontWeight: 900, letterSpacing: '0.08em',
                  padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase',
                  background: `${rc}22`, border: `1px solid ${rc}40`, color: rc,
                }}>
                  {stats.topCard.rarity}
                </div>
                {/* handle */}
                <div style={{ position: 'absolute', bottom: 5, left: 6, right: 6 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#f0eaf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{stats.topCard.handle}
                  </div>
                </div>
              </div>
              <div style={{ padding: '7px 8px 9px' }}>
                <div style={{ fontSize: 6, fontWeight: 700, letterSpacing: '0.18em', color: '#5a4a70', textTransform: 'uppercase', marginBottom: 2 }}>
                  Top Rated
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: rc, lineHeight: 1 }}>
                  {stats.topCard.battleScore}
                </div>
                <div style={{ fontSize: 7, color: '#5a4a70', marginTop: 1, letterSpacing: '0.08em' }}>Protocol Score</div>
              </div>
            </div>
          );
        })()}

        {/* Open packs CTA + my cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onGoToPacks}
            style={{
              flex: 1, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${purple} 0%, ${accent} 100%)`,
              color: '#fff', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: `0 6px 24px ${accent}30`,
              minHeight: 90,
            }}
          >
            <span style={{ fontSize: 24 }}>◆</span>
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Open Packs
            </span>
            <span style={{ fontSize: 8, opacity: 0.75, letterSpacing: '0.1em' }}>
              Collect identity cards
            </span>
          </button>

          {totalOwned > 0 && (
            <button
              onClick={onGoToCards}
              style={{
                borderRadius: 10, padding: '9px 0',
                border: '1px solid rgba(138,99,210,0.25)',
                background: 'rgba(138,99,210,0.07)',
                color: '#a08cc0', cursor: 'pointer',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              ⚔ My Cards · {totalOwned}
            </button>
          )}
        </div>
      </div>

      {/* ── Action row ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={onGoToLeague}
          style={{
            flex: 1, borderRadius: 11, padding: '13px 6px',
            border: `1px solid ${accent}30`,
            background: `${accent}0c`,
            color: accent, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ fontSize: 20 }}>🏆</span>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            My League
          </span>
          <span style={{ fontSize: 7, color: '#5a4a70', letterSpacing: '0.08em' }}>
            {stats ? `${stats.weekTeams} competing` : '…'}
          </span>
        </button>

        <button
          onClick={onGoToBrowse}
          style={{
            flex: 1, borderRadius: 11, padding: '13px 6px',
            border: '1px solid rgba(138,99,210,0.18)',
            background: 'rgba(138,99,210,0.05)',
            color: '#a08cc0', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ fontSize: 20 }}>🃏</span>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Browse Cards
          </span>
          <span style={{ fontSize: 7, color: '#5a4a70', letterSpacing: '0.08em' }}>
            {stats ? `${stats.totalCards.toLocaleString()} in circulation` : '…'}
          </span>
        </button>
      </div>

      {/* ── Protocol Leaders ─────────────────────────────────────────────────── */}
      {stats?.topPlayers && stats.topPlayers.length > 0 && (
        <div style={{
          borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          background: 'rgba(138,99,210,0.04)',
          border: '1px solid rgba(138,99,210,0.12)',
        }}>
          <div style={{
            fontSize: 7, fontWeight: 900, letterSpacing: '0.3em',
            color: '#5a4a70', textTransform: 'uppercase', marginBottom: 10,
          }}>
            Protocol Leaders
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.topPlayers.map((p, i) => {
              const medalColor = i === 0 ? '#C9A84C' : i === 1 ? '#a8a8a8' : '#cd7f32';
              return (
                <div key={p.ownerFid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 18, textAlign: 'center', flexShrink: 0, fontSize: i === 0 ? 13 : 11, fontWeight: 900, color: medalColor }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#e0d4f0' }}>
                    @{p.handle}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.05em' }}>
                    ⬡ {p.protocolPoints.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={onGoToLeaderboard}
            style={{
              marginTop: 10, width: '100%', padding: '8px', borderRadius: 8,
              border: '1px solid rgba(138,99,210,0.15)', background: 'transparent',
              color: '#5a4a70', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Full Leaderboard →
          </button>
        </div>
      )}

      {/* ── Edition badge ────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center', padding: '10px 0 2px',
        fontSize: 8, fontWeight: 700, letterSpacing: '0.35em',
        color: `${accent}60`, textTransform: 'uppercase',
      }}>
        {edition.name !== 'Base' ? `${edition.name} Edition` : 'The Protocol'} · {edition.theme.headerEra}
      </div>

      {/* ── How to Play ──────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 16, borderRadius: 12, overflow: 'hidden',
        border: '1px solid rgba(138,99,210,0.14)',
      }}>
        <button
          onClick={() => setHowToOpen(o => !o)}
          style={{
            width: '100%', padding: '13px 16px',
            background: howToOpen ? 'rgba(138,99,210,0.08)' : 'rgba(138,99,210,0.04)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: '#a08cc0', textTransform: 'uppercase' }}>
            How to Play
          </span>
          <span style={{
            fontSize: 13, color: '#5a4a70',
            display: 'inline-block',
            transform: howToOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>
            ↓
          </span>
        </button>

        {howToOpen && (
          <div style={{ padding: '0 16px 14px', background: 'rgba(138,99,210,0.03)', borderTop: '1px solid rgba(138,99,210,0.1)' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: 14, padding: '14px 0',
                borderBottom: i < STEPS.length - 1 ? '1px solid rgba(138,99,210,0.07)' : 'none',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${accent}14`, border: `1px solid ${accent}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 900, color: accent, letterSpacing: '0.08em',
                  marginTop: 1,
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#e0d4f0', marginBottom: 4 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 9, color: '#7a6a90', lineHeight: 1.65 }}>
                    {step.body}
                  </div>
                </div>
              </div>
            ))}

            {/* Points cheatsheet */}
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)',
            }}>
              <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.25em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 7 }}>
                Points at a glance
              </div>
              {[
                ['+50', 'App install bonus'],
                ['+15', 'Lock in a weekly team'],
                ['+20', 'Compete in a week'],
                ['+1×', 'Per opponent beaten per slot'],
                ['+50', 'Top-half finish (overall win)'],
                ['+25', 'Rare card used (FID ≤ 100)'],
                ['+10', 'Pack opened'],
                ['+100', 'Referral join'],
              ].map(([pts, label]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: '#7a6a90' }}>{label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C' }}>{pts}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
