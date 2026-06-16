'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onGoToPacks: () => void;
  onGoToLeague: () => void;
}

const cards = [
  ['Supply', 'Lower FIDs score higher. The score uses a log curve, so early identities feel scarce without making newer FIDs useless.'],
  ['Followers', 'Follower count is log-scaled against a 1,000,000 follower ceiling. Big accounts matter, but every jump gets harder.'],
  ['Neynar', 'Neynar score is converted to a 0-100 force stat and reflects current Farcaster reputation signals.'],
  ['Activity', 'Recent reply engagement is sampled from cast data and capped at 100. Active cards can punch above their rarity.'],
  ['Badge', 'Power badge, Neynar score, verifications, and following count combine into a social-proof score.'],
  ['Freshness', 'Profile image freshness fades across roughly a year from the captured image date.'],
];

const game = [
  'Open packs to collect Protocol cards and build your team. Any card can come from any pack, but Tablet and Codex packs are more likely to hold high scorers and rare cards.',
  'Build your team by choosing who you think will perform best in each criterion. Your card in each slot competes against the cards other players place in that same slot.',
  'Activity is monitored and displayed during the game. Final scoring is calculated at game end from Farcaster/Neynar activity tracked during the round.',
  'Earn Protocol Points for playing, opening packs, beating opposing slots, climbing the leaderboard, sharing, referrals, rare FID picks, and daily spins.',
];

const pointRewards = [
  ['Lock team', '+25'],
  ['Game played', '+20'],
  ['Open pack', '+10'],
  ['Slot beaten', '+1'],
  ['Top 25', '+75'],
  ['Top half', '+50'],
  ['FID 1-100', '+25'],
  ['Share', '+5'],
  ['Referral pack', '+100'],
  ['Daily spin', '0-150'],
];

const disclaimers = [
  'The Protocol is an unofficial Farcaster game and is not affiliated with Farcaster, Warpcast, Neynar, Faces, or any depicted person.',
  'Cards use public Farcaster profile imagery and metadata. Images and stats can change, API data may lag, and scoring depends on available external data.',
  'Cards, points, editions, and spins are gameplay items only. The daily spin awards Protocol Points only, never cash, packs, or anything with guaranteed value.',
  'If a profile image should not appear, players can report a card or use the profile opt-out flow.',
];

export default function WelcomeModal({ onClose, onGoToPacks, onGoToLeague }: Props) {
  const [section, setSection] = useState<'play' | 'cards' | 'rules'>('play');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1300,
      background: 'rgba(5,1,12,0.84)',
      backdropFilter: 'blur(12px)',
      display: 'grid', placeItems: 'center',
      padding: 16,
    }}>
      <div style={{
        width: 'min(94vw, 430px)',
        maxHeight: '88dvh',
        overflow: 'auto',
        borderRadius: 10,
        border: '1px solid rgba(201,168,76,0.32)',
        background: 'linear-gradient(180deg, rgba(17,10,29,0.98), rgba(8,4,14,0.98))',
        boxShadow: '0 0 48px rgba(138,99,210,0.34)',
      }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(138,99,210,0.16)' }}>
          <div style={{
            fontSize: 8, fontWeight: 900, letterSpacing: '0.28em',
            color: '#C9A84C', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Welcome to The Protocol
          </div>
          <h2 style={{
            margin: 0, color: '#f4ecff', fontSize: 26, lineHeight: 1.05,
            fontWeight: 900, letterSpacing: 0,
          }}>
            Collect Protocol cards and build your team!
          </h2>
          <p style={{ margin: '10px 0 0', color: '#a997c4', fontSize: 11, lineHeight: 1.6 }}>
            The Protocol turns Farcaster Protocol data into a team-building and card-collection game. Improve your teams to score big, unlock new editions, and beat the leaderboard.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '12px 14px 0' }}>
          {[
            ['play', 'Play'],
            ['cards', 'Cards'],
            ['rules', 'Rules'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSection(id as 'play' | 'cards' | 'rules')}
              style={{
                flex: 1, borderRadius: 8, padding: '8px 0',
                border: section === id ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(138,99,210,0.18)',
                background: section === id ? 'rgba(201,168,76,0.12)' : 'rgba(138,99,210,0.05)',
                color: section === id ? '#C9A84C' : '#a08cc0',
                fontSize: 9, fontWeight: 900, letterSpacing: '0.12em',
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 16px 16px' }}>
          {section === 'play' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {game.map((item, i) => (
                <div key={item} style={{
                  display: 'flex', gap: 10, padding: '10px 11px',
                  borderRadius: 8, background: 'rgba(138,99,210,0.05)',
                  border: '1px solid rgba(138,99,210,0.12)',
                }}>
                  <div style={{ width: 18, flexShrink: 0, color: '#C9A84C', fontSize: 10, fontWeight: 900 }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ color: '#d9cdee', fontSize: 10, lineHeight: 1.55 }}>{item}</div>
                </div>
              ))}
              <div style={{
                borderRadius: 8,
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.18)',
                padding: '10px 11px',
              }}>
                <div style={{ color: '#C9A84C', fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Points
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {pointRewards.map(([label, points]) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between', gap: 8,
                      borderRadius: 6, padding: '5px 7px',
                      background: 'rgba(7,2,14,0.32)',
                      border: '1px solid rgba(201,168,76,0.1)',
                    }}>
                      <span style={{ color: '#bbaed0', fontSize: 8 }}>{label}</span>
                      <span style={{ color: '#C9A84C', fontSize: 8, fontWeight: 900 }}>{points}</span>
                    </div>
                  ))}
                </div>
                <div style={{ color: '#a997c4', fontSize: 9, lineHeight: 1.45, marginTop: 8 }}>
                  Editions start unlocking at 1,000 Protocol Points. Each unlock changes the theme and adds a bonus slot that stacks onto your team.
                </div>
              </div>
            </div>
          )}

          {section === 'cards' && (
            <div>
              <p style={{ margin: '0 0 10px', color: '#a997c4', fontSize: 10, lineHeight: 1.55 }}>
                Protocol Score is a weighted card strength rating: Supply 25%, Followers 20%, Neynar 20%, Activity 10%, Badge 10%, Freshness 15%.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {cards.map(([title, body]) => (
                  <div key={title} style={{
                    borderRadius: 8, padding: '9px 10px',
                    background: 'rgba(138,99,210,0.05)',
                    border: '1px solid rgba(138,99,210,0.12)',
                  }}>
                    <div style={{ color: '#C9A84C', fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>
                      {title}
                    </div>
                    <div style={{ color: '#cdbfe0', fontSize: 9, lineHeight: 1.45 }}>{body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {disclaimers.map(item => (
                <div key={item} style={{
                  borderRadius: 8, padding: '10px 11px',
                  background: 'rgba(34,197,94,0.045)',
                  border: '1px solid rgba(34,197,94,0.14)',
                  color: '#bde8cb', fontSize: 9, lineHeight: 1.55,
                }}>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          padding: '0 16px 16px',
        }}>
          <button
            onClick={() => { onClose(); onGoToPacks(); }}
            style={{
              border: 'none', borderRadius: 8, padding: '12px 8px',
              background: 'linear-gradient(135deg, #8a63d2, #C9A84C)',
              color: '#fff', fontSize: 10, fontWeight: 900,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Open Packs
          </button>
          <button
            onClick={() => { onClose(); onGoToLeague(); }}
            style={{
              borderRadius: 8, padding: '12px 8px',
              border: '1px solid rgba(138,99,210,0.28)',
              background: 'rgba(138,99,210,0.08)',
              color: '#c8b6ea', fontSize: 10, fontWeight: 900,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Build Team
          </button>
          <button
            onClick={onClose}
            style={{
              gridColumn: '1 / -1',
              border: 'none', background: 'none', color: '#6f5e86',
              fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', cursor: 'pointer',
              padding: '2px 0 0',
            }}
          >
            Enter The Protocol
          </button>
        </div>
      </div>
    </div>
  );
}
