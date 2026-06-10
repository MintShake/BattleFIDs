'use client';

import Image from 'next/image';
import { Edition } from '@/editions/types';

interface Props {
  editions: Edition[];
  onSelect: (editionId: string) => void;
  onClose:  () => void;
  currentId?: string;
}

export default function EditionSelect({ editions, onSelect, onClose, currentId }: Props) {
  const list = editions.length > 0 ? editions : [];

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#07020e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Back button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, left: 16,
          background: 'none', border: 'none',
          color: '#7a6a90', fontSize: 22, cursor: 'pointer',
          minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        ←
      </button>

      <div style={{ textAlign: 'center', padding: '32px 20px 20px' }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.45em',
          color: '#6b5a80', textTransform: 'uppercase', margin: '0 0 8px',
        }}>
          FARCASTER · THE PROTOCOL
        </p>
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 56px)',
          fontWeight: 900, letterSpacing: '0.08em',
          background: 'linear-gradient(90deg, #8a63d2, #C9A84C, #8a63d2)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', lineHeight: 1, margin: 0,
        }}>
          CHOOSE<br />EDITION
        </h1>
        <p style={{ fontSize: 11, color: '#7a6a90', marginTop: 10, letterSpacing: '0.05em', lineHeight: 1.5 }}>
          Each edition is a themed season with its own<br />card rankings, league rules, and visual world.
        </p>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: '4px 20px 40px', width: '100%', maxWidth: 480, boxSizing: 'border-box',
      }}>
        {list.map(ed => {
          const isActive  = ed.id === currentId;
          const tagLabel  = ed.ui?.tagLabel  ?? 'LIVE';
          const tagColor  = ed.ui?.tagColor  ?? ed.theme.accentPrimary;
          const desc      = ed.ui?.description ?? ed.league.rules;

          return (
            <button
              key={ed.id}
              onClick={() => onSelect(ed.id)}
              style={{
                position: 'relative',
                width: '100%', border: 'none', padding: 0,
                borderRadius: 20, overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: isActive
                  ? `0 0 0 2px ${ed.theme.accentPrimary}, 0 0 30px ${ed.theme.accentPrimary}40`
                  : '0 4px 24px rgba(0,0,0,0.5)',
                transform: isActive ? 'scale(1.01)' : undefined,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                <Image
                  src={ed.theme.bgImage}
                  alt={ed.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(7,2,14,0.2) 0%, rgba(7,2,14,0.75) 60%, rgba(7,2,14,0.95) 100%)',
                }} />

                <div style={{
                  position: 'absolute', inset: 0, padding: '14px 18px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', textAlign: 'left',
                }}>
                  <div style={{
                    position: 'absolute', top: 14, left: 18,
                    fontSize: 8, fontWeight: 900, letterSpacing: '0.25em',
                    padding: '3px 10px', borderRadius: 99,
                    background: `${tagColor}22`, border: `1px solid ${tagColor}60`, color: tagColor,
                  }}>
                    {tagLabel}
                  </div>

                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 14, right: 18,
                      fontSize: 8, fontWeight: 900, letterSpacing: '0.2em',
                      padding: '3px 10px', borderRadius: 99,
                      background: `${ed.theme.accentPrimary}30`,
                      border: `1px solid ${ed.theme.accentPrimary}`,
                      color: ed.theme.accentPrimary,
                    }}>
                      ACTIVE
                    </div>
                  )}

                  <div>
                    <h2 style={{
                      fontSize: 'clamp(18px, 4vw, 26px)',
                      fontWeight: 900, letterSpacing: '0.08em',
                      color: '#f8f4ff', margin: '0 0 4px',
                      textShadow: `0 0 20px ${ed.theme.accentPrimary}60`,
                    }}>
                      {ed.name.toUpperCase()}
                    </h2>
                    <p style={{ fontSize: 11, color: '#8a7fa0', margin: '0 0 12px', lineHeight: 1.4 }}>
                      {desc}
                    </p>

                    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                      {(['Alpha', 'Legendary', 'Elite', 'Rare', 'Common'] as const).map(r => (
                        <div key={r} style={{
                          flex: 1, height: 3, borderRadius: 99,
                          background: ed.rarity[r].accent,
                          opacity: r === 'Alpha' ? 1 : r === 'Legendary' ? 0.85 : r === 'Elite' ? 0.7 : r === 'Rare' ? 0.55 : 0.35,
                        }} />
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(['Alpha', 'Legendary', 'Elite'] as const).map(r => (
                        <span key={r} style={{
                          fontSize: 7, fontWeight: 900, letterSpacing: '0.15em',
                          padding: '2px 7px', borderRadius: 99,
                          background: `${ed.rarity[r].accent}18`,
                          border: `1px solid ${ed.rarity[r].accent}40`,
                          color: ed.rarity[r].accent,
                        }}>
                          {ed.rarity[r].tier}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px 18px',
                background: `linear-gradient(135deg, ${ed.theme.accentPrimary}14, ${ed.theme.accentSecondary}0a)`,
                borderTop: `1px solid ${ed.theme.accentPrimary}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 10, color: '#a08cc0', letterSpacing: '0.1em' }}>
                  {ed.league.seasonLabel}
                </span>
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: ed.theme.accentPrimary }}>
                  {isActive ? '◈ PLAYING' : 'ENTER →'}
                </span>
              </div>
            </button>
          );
        })}

        {list.length === 0 && (
          <div style={{ textAlign: 'center', color: '#7a6a90', fontSize: 12, paddingTop: 40 }}>
            Loading editions…
          </div>
        )}
      </div>
    </div>
  );
}
