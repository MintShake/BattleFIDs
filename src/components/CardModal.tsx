'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { BattleFIDCard, STAT_LABELS, STAT_ORDER, StatKey } from '@/types/card';
import { computeBadges } from '@/lib/badges';
import { BADGE_COLORS, BadgeRarity } from '@/types/badge';
import { cardValue, cardValueUsdc } from '@/lib/valuation';
import { isContractDeployed, ROYALTY_PCT } from '@/lib/contract';
import WalletConnect from './WalletConnect';

const STAT_INFO: Record<StatKey, string> = {
  supplyRarity:  'Based on FID number. Lower FID = lower max supply = rarer card. FID 1 = only 1 can ever exist.',
  followerPower: 'Neynar follower count, log-normalised against 1M. More followers = stronger card.',
  neynarForce:   'Neynar engagement score (0–100). Reflects overall Farcaster activity and influence.',
  castActivity:  'Reply interactivity: how often this user replies to others, sampled from their last 50 posts.',
  badgeScore:    'Neynar power badge (score ≥ 0.5) + verified wallet addresses + following engagement.',
  pfpFreshness:  'How recently this PFP was captured. Newest variant scores highest. Decays over 365 days.',
  xploraXP:      'Xplora XP — cross-app experience points. Coming soon: earn XP by playing The Protocol and other Xplora-integrated mini apps.',
};

interface ProfileRow {
  image_id: string;
  pfp_url: string;
  thumb_url: string;
  variant_index: number;
  stored_at: string;
  like_count: number;
  battle_score: number;
  rarity: string;
}

interface ProfileData {
  cards: ProfileRow[];
  neynarUser: {
    username: string;
    display_name: string;
    follower_count: number;
    following_count: number;
    score: number;
    verifications: string[];
    profile?: { bio?: { text?: string } };
  } | null;
}

interface Props {
  card: BattleFIDCard;
  serialNumber?: number;
  ownerHandle?: string;
  onClose: () => void;
}

export default function CardModal({ card, serialNumber, ownerHandle, onClose }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeInfo, setActiveInfo] = useState<StatKey | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerSent, setOfferSent]   = useState(false);
  const [copied, setCopied]         = useState(false);

  const badges = computeBadges(card);

  // Auto-flip after short pause
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Fetch full profile on mount
  useEffect(() => {
    fetch(`/api/profile/${card.fid}`)
      .then(r => r.ok ? r.json() : null)
      .then(setProfile)
      .catch(() => {});
  }, [card.fid]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleShare = useCallback(async () => {
    const text = `Check out ${card.displayName} (@${card.handle}) — Battle Score ${card.battleScore} | FID #${card.fid} | The Protocol 2026`;
    if (navigator.share) {
      await navigator.share({ text, url: 'https://battle-fids.vercel.app' }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [card]);

  const mockFloor     = cardValue(card, serialNumber);
  const mockFloorUsdc = cardValueUsdc(card, serialNumber);
  const contractLive  = isContractDeployed();

  function handleSendOffer() {
    // TODO: call contract offer function once deployed
    setOfferSent(true);
    setTimeout(() => { setOfferOpen(false); setOfferSent(false); setOfferAmount(''); }, 2000);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(5,1,12,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      {/* Scene */}
      <div
        style={{
          width: '100%', maxWidth: 420,
          maxHeight: '92vh',
          position: 'relative',
          perspective: '1400px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -44, right: 0, zIndex: 10,
            width: 36, height: 36, borderRadius: '50%',
            border: '1px solid rgba(138,99,210,0.3)',
            background: 'rgba(9,4,15,0.8)',
            color: '#8a63d2', fontSize: 18, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 36,
          }}
        >×</button>

        {/* Flip toggle */}
        <button
          onClick={() => setFlipped(f => !f)}
          style={{
            position: 'absolute', top: -44, left: 0, zIndex: 10,
            padding: '6px 14px', borderRadius: 99,
            border: '1px solid rgba(138,99,210,0.3)',
            background: 'rgba(9,4,15,0.8)',
            color: '#8a63d2', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            minHeight: 36,
          }}
        >
          {flipped ? '← Card' : 'Profile →'}
        </button>

        {/* Flipper */}
        <div style={{
          position: 'relative',
          width: '100%', height: '80vh',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.4,0,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>

          {/* ── FRONT: card face ─────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            overflowY: 'auto',
            borderRadius: 20,
          }}>
            <CardFace card={card} serialNumber={serialNumber} ownerHandle={ownerHandle} badges={badges} />
          </div>

          {/* ── BACK: profile detail ─────────────────────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            overflowY: 'auto',
            borderRadius: 20,
            background: '#0a0415',
            border: '1px solid rgba(138,99,210,0.25)',
          }}>
            <ProfileBack
              card={card}
              serialNumber={serialNumber}
              profile={profile}
              badges={badges}
              activeInfo={activeInfo}
              setActiveInfo={setActiveInfo}
              mockFloor={mockFloor}
              mockFloorUsdc={mockFloorUsdc}
              contractLive={contractLive}
              offerOpen={offerOpen}
              setOfferOpen={setOfferOpen}
              offerAmount={offerAmount}
              setOfferAmount={setOfferAmount}
              offerSent={offerSent}
              onSendOffer={handleSendOffer}
              copied={copied}
              onShare={handleShare}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card face (front) ──────────────────────────────────────────────────────

function CardFace({ card, serialNumber, ownerHandle, badges }: {
  card: BattleFIDCard;
  serialNumber?: number;
  ownerHandle?: string;
  badges: ReturnType<typeof computeBadges>;
}) {
  const RARITY_ACCENT: Record<string, string> = {
    Alpha: '#C9A84C', Legendary: '#8a63d2', Elite: '#cd7f32', Rare: '#a78bfa', Common: '#8a7550',
  };
  const accent = RARITY_ACCENT[card.rarity] ?? '#8a63d2';

  return (
    <div style={{
      background: `linear-gradient(135deg, ${accent}40, transparent)`,
      borderRadius: 18, padding: 2,
      border: `2px solid ${accent}60`,
      boxShadow: `0 0 40px ${accent}40, 0 0 80px ${accent}20`,
    }}>
      <div style={{ background: '#09040f', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
          <Image src={card.pfpUrl} alt={card.displayName} fill
            style={{ objectFit: 'cover' }} unoptimized />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(transparent 50%, rgba(9,4,15,0.95) 100%)',
          }} />
          <div style={{
            position: 'absolute', top: 10, left: 10,
            fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 99,
            background: 'rgba(0,0,0,0.75)', color: accent, border: `1px solid ${accent}40`,
          }}>
            {card.fid === 1 ? '1 OF 1' : `MAX ${card.fid.toLocaleString()}`}
          </div>
          <div style={{
            position: 'absolute', top: 10, right: 10,
            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
            background: 'rgba(0,0,0,0.75)', color: '#7c6a96',
          }}>FID #{card.fid}</div>
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#f0eaf8', lineHeight: 1.1 }}>
              {card.displayName}
            </div>
            <div style={{ fontSize: 11, color: '#a08cc0' }}>@{card.handle}</div>
          </div>
        </div>

        {/* Badge strip */}
        {badges.length > 0 && (
          <div style={{ padding: '8px 12px 4px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {badges.map(b => (
              <span key={b.id} style={{
                fontSize: 9, padding: '3px 8px', borderRadius: 99, fontWeight: 700,
                letterSpacing: '0.1em',
                background: BADGE_COLORS[b.rarity as BadgeRarity].bg,
                color: BADGE_COLORS[b.rarity as BadgeRarity].color,
                border: `1px solid ${BADGE_COLORS[b.rarity as BadgeRarity].border}`,
              }}>
                {b.emoji} {b.name}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ padding: '8px 14px 10px' }}>
          {STAT_ORDER.map(key => {
            const score = card.stats[key];
            return (
              <div key={key} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: '#a08cc0', textTransform: 'uppercase' }}>
                    {STAT_LABELS[key]}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: accent }}>{score}</span>
                </div>
                <div style={{ height: 3, background: '#1a0f26', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          margin: '0 10px 10px', borderRadius: 10, padding: '8px 12px',
          background: `${accent}0c`, border: `1px solid ${accent}25`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.25em', color: '#7a6a90', textTransform: 'uppercase' }}>Battle Score</div>
            {serialNumber !== undefined && (
              <div style={{ fontSize: 8, color: '#7a6a90', marginTop: 1 }}>
                #{serialNumber} / {card.fid.toLocaleString()}
                {ownerHandle && <span style={{ color: '#a08cc0', marginLeft: 4 }}>· @{ownerHandle}</span>}
              </div>
            )}
          </div>
          <span style={{ fontSize: 32, fontWeight: 900, color: accent }}>{card.battleScore}</span>
        </div>
      </div>
    </div>
  );
}

// ── Profile back ───────────────────────────────────────────────────────────

function ProfileBack({
  card, serialNumber, profile, badges, activeInfo, setActiveInfo,
  mockFloor, mockFloorUsdc, contractLive,
  offerOpen, setOfferOpen, offerAmount, setOfferAmount, offerSent, onSendOffer,
  copied, onShare,
}: {
  card: BattleFIDCard;
  serialNumber?: number;
  profile: ProfileData | null;
  badges: ReturnType<typeof computeBadges>;
  activeInfo: StatKey | null;
  setActiveInfo: (k: StatKey | null) => void;
  mockFloor: string;
  mockFloorUsdc: string;
  contractLive: boolean;
  offerOpen: boolean;
  setOfferOpen: (v: boolean) => void;
  offerAmount: string;
  setOfferAmount: (v: string) => void;
  offerSent: boolean;
  onSendOffer: () => void;
  copied: boolean;
  onShare: () => void;
}) {
  const bio = profile?.neynarUser?.profile?.bio?.text;
  const followers = profile?.neynarUser?.follower_count ?? 0;
  const following = profile?.neynarUser?.following_count ?? 0;
  const verifications = profile?.neynarUser?.verifications ?? [];
  const pfpHistory = profile?.cards ?? [];

  const RARITY_ACCENT: Record<string, string> = {
    Alpha: '#C9A84C', Legendary: '#8a63d2', Elite: '#cd7f32', Rare: '#a78bfa', Common: '#8a7550',
  };
  const accent = RARITY_ACCENT[card.rarity] ?? '#8a63d2';

  const section = (title: string) => (
    <div style={{
      fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase',
      color: '#6b5a80', marginBottom: 10, paddingBottom: 4,
      borderBottom: `1px solid ${accent}20`,
    }}>{title}</div>
  );

  return (
    <div style={{ padding: '16px 14px 24px' }}>

      {/* Hero */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
          border: `2px solid ${accent}50`, boxShadow: `0 0 16px ${accent}30`,
        }}>
          <Image src={card.pfpUrl} alt={card.displayName} width={68} height={68}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#f0eaf8', lineHeight: 1.2, marginBottom: 2 }}>
            {card.displayName}
          </div>
          <div style={{ fontSize: 11, color: '#a08cc0', marginBottom: 5 }}>@{card.handle}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 99,
              background: `${accent}18`, color: accent, border: `1px solid ${accent}40`,
              fontWeight: 700, letterSpacing: '0.1em',
            }}>FID #{card.fid}</span>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 99,
              background: 'rgba(138,99,210,0.1)', color: '#8a63d2', border: '1px solid rgba(138,99,210,0.3)',
              fontWeight: 700, letterSpacing: '0.1em',
            }}>{card.rarity.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: '#8a7a9a', lineHeight: 1.5, margin: 0 }}>{bio}</p>
        </div>
      )}

      {/* Social stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'FOLLOWERS', value: followers.toLocaleString() },
          { label: 'FOLLOWING', value: following.toLocaleString() },
          { label: 'BATTLE', value: String(card.battleScore) },
          { label: 'VERIFIED', value: verifications.length > 0 ? '✓' : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#e0d4f0' }}>{value}</div>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', color: '#6b5a80', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {section('Badges · Faces + Farcaster')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {badges.map(b => {
              const c = BADGE_COLORS[b.rarity as BadgeRarity];
              return (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 10,
                  background: c.bg, border: `1px solid ${c.border}`,
                }}>
                  <span style={{ fontSize: 18 }}>{b.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', color: c.color }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: 9, color: '#6a5a7a', marginTop: 1 }}>{b.description}</div>
                  </div>
                  <span style={{
                    fontSize: 7, padding: '2px 6px', borderRadius: 99, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                  }}>{b.rarity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Community — sourced from Faces mini app */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            fontSize: 8, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: '#6b5a80', paddingBottom: 4, borderBottom: `1px solid ${accent}20`, flex: 1,
          }}>Community</div>
          <a
            href="https://warpcast.com/~/mini-apps/launch?url=https%3A%2F%2Ffaces.sh"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(138,99,210,0.12)',
              color: '#8a63d2', border: '1px solid rgba(138,99,210,0.3)',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            Powered by Faces ↗
          </a>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#e86a6a' }}>❤</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#f0eaf8' }}>{card.likeCount.toLocaleString()}</div>
            <div style={{ fontSize: 7, color: '#6b5a80', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Likes</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#8a63d2' }}>🖼</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#f0eaf8' }}>{card.totalVariants}</div>
            <div style={{ fontSize: 7, color: '#6b5a80', letterSpacing: '0.15em', textTransform: 'uppercase' }}>PFPs</div>
          </div>
          <div style={{ flex: 1, fontSize: 9, color: '#7a6a90', lineHeight: 1.5 }}>
            Likes and PFP history are sourced from the <strong style={{ color: '#8a63d2' }}>Faces</strong> mini app — a community curation layer for Farcaster profiles.
          </div>
        </div>
      </div>

      {/* PFP History */}
      {pfpHistory.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          {section(`PFP History · ${pfpHistory.length} discovered`)}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {pfpHistory.map((row, i) => (
              <div key={row.image_id} style={{ flexShrink: 0, position: 'relative' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 10, overflow: 'hidden',
                  border: row.variant_index === card.variantIndex
                    ? `2px solid ${accent}` : '2px solid rgba(138,99,210,0.2)',
                }}>
                  <Image src={row.pfp_url} alt={`v${i}`} width={60} height={60}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                </div>
                {row.variant_index === 0 && (
                  <div style={{ position: 'absolute', bottom: -2, right: -2,
                    fontSize: 8, background: accent, color: '#000', borderRadius: 4, padding: '1px 3px', fontWeight: 700 }}>
                    NOW
                  </div>
                )}
                {row.variant_index === pfpHistory.length - 1 && pfpHistory.length > 1 && (
                  <div style={{ position: 'absolute', bottom: -2, left: -2,
                    fontSize: 8, background: '#6b5a80', color: '#8a63d2', borderRadius: 4, padding: '1px 3px', fontWeight: 700 }}>
                    OG
                  </div>
                )}
                <div style={{ fontSize: 7, color: '#6b5a80', textAlign: 'center', marginTop: 2 }}>
                  ❤ {row.like_count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats with info */}
      <div style={{ marginBottom: 16 }}>
        {section('Stats Breakdown')}
        {STAT_ORDER.map(key => {
          const score = card.stats[key];
          const isActive = activeInfo === key;
          return (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#a08cc0', textTransform: 'uppercase' }}>
                    {STAT_LABELS[key]}
                  </span>
                  <button
                    onClick={() => setActiveInfo(isActive ? null : key)}
                    style={{
                      width: 14, height: 14, borderRadius: '50%', border: 'none',
                      background: isActive ? accent : 'rgba(138,99,210,0.2)',
                      color: isActive ? '#000' : '#a08cc0',
                      fontSize: 8, fontWeight: 900, lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', minHeight: 0, padding: 0,
                    }}
                  >ⓘ</button>
                </div>
                <span style={{ fontSize: 10, fontWeight: 900, color: accent }}>{score}</span>
              </div>
              {isActive && (
                <div style={{
                  fontSize: 9, color: '#8a7a9a', lineHeight: 1.5,
                  padding: '6px 8px', borderRadius: 6, marginBottom: 4,
                  background: 'rgba(138,99,210,0.06)',
                  border: '1px solid rgba(138,99,210,0.15)',
                }}>
                  {STAT_INFO[key]}
                </div>
              )}
              <div style={{ height: 4, background: '#1a0f26', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* NFT market section */}
      <div style={{ marginBottom: 16 }}>
        {section('NFT · Market')}

        {/* Value + serial row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Est. Floor',  value: mockFloor,     color: '#C9A84C' },
            { label: '≈ USD',       value: mockFloorUsdc, color: '#a78bfa' },
            { label: 'Last Sale',   value: '—',           color: '#a08cc0' },
            { label: 'Supply',      value: card.maxSupply.toLocaleString(), color: '#f0eaf8' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, padding: '8px 4px', borderRadius: 10, textAlign: 'center',
              background: 'rgba(138,99,210,0.04)',
              border: '1px solid rgba(138,99,210,0.1)',
            }}>
              <div style={{ fontSize: 6, color: '#6b5a80', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Serial number */}
        {serialNumber !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 10, marginBottom: 10,
            background: `${accent}08`, border: `1px solid ${accent}20`,
          }}>
            <div>
              <div style={{ fontSize: 7, color: '#6b5a80', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 1 }}>Serial No.</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: accent }}>
                #{serialNumber}
                <span style={{ fontSize: 10, color: '#a08cc0', fontWeight: 400, marginLeft: 4 }}>
                  of {card.maxSupply.toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              {serialNumber <= Math.max(1, Math.floor(card.maxSupply * 0.1)) && (
                <div style={{
                  fontSize: 7, padding: '3px 8px', borderRadius: 99, fontWeight: 900,
                  background: `${accent}18`, border: `1px solid ${accent}40`, color: accent,
                  letterSpacing: '0.1em',
                }}>LOW SERIAL ★</div>
              )}
              <div style={{
                fontSize: 7, padding: '3px 8px', borderRadius: 99, fontWeight: 700,
                background: contractLive ? 'rgba(34,197,94,0.12)' : 'rgba(138,99,210,0.1)',
                border: contractLive ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(138,99,210,0.2)',
                color: contractLive ? '#22c55e' : '#8a63d2',
              }}>
                {contractLive ? '⬡ On-chain NFT' : '⬡ NFT on deploy'}
              </div>
            </div>
          </div>
        )}

        {/* Royalty info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 10, marginBottom: 12,
          background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)',
        }}>
          <span style={{ fontSize: 13 }}>⚖</span>
          <div style={{ fontSize: 9, color: '#8a7550', lineHeight: 1.4 }}>
            <strong style={{ color: '#C9A84C' }}>{ROYALTY_PCT}% creator royalty</strong> on every
            secondary sale · ERC-2981 on Base · Minted automatically on pack open
          </div>
        </div>

        {/* Make offer / action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: offerOpen ? 12 : 0 }}>
          <button
            onClick={() => setOfferOpen(!offerOpen)}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              background: contractLive
                ? 'linear-gradient(90deg, #8a63d2, #6d28d9)'
                : 'rgba(138,99,210,0.15)',
              color: contractLive ? '#fff' : '#8a63d2',
              fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
              border: contractLive ? 'none' : '1px solid rgba(138,99,210,0.3)',
            }}
          >
            {offerOpen ? 'Cancel' : 'Make Offer'}
          </button>
          <button
            onClick={onShare}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              border: '1px solid rgba(138,99,210,0.3)',
              background: 'transparent',
              color: '#8a63d2', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copied' : 'Share'}
          </button>
        </div>

        {/* Offer form */}
        {offerOpen && (
          <div style={{
            padding: '14px', borderRadius: 12,
            background: '#0a0318', border: '1px solid rgba(138,99,210,0.25)',
          }}>
            {!contractLive && (
              <div style={{
                fontSize: 8, color: '#a08cc0', fontStyle: 'italic',
                marginBottom: 10, lineHeight: 1.4,
              }}>
                Contract coming soon — submit interest below and the owner will be notified when trading is live.
              </div>
            )}

            {contractLive && (
              <div style={{ marginBottom: 10 }}>
                <WalletConnect />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                placeholder={`Offer in USDC (floor: ${mockFloorUsdc})`}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8,
                  border: '1px solid rgba(138,99,210,0.3)',
                  background: 'rgba(138,99,210,0.06)',
                  color: '#e0d4f0', fontSize: 11, outline: 'none',
                }}
              />
              <button
                onClick={onSendOffer}
                disabled={!offerAmount || offerSent}
                style={{
                  padding: '10px 18px', borderRadius: 8, border: 'none',
                  background: offerSent
                    ? 'rgba(34,197,94,0.2)'
                    : 'linear-gradient(90deg, #C9A84C, #a07830)',
                  color: offerSent ? '#22c55e' : '#000',
                  fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                  cursor: offerAmount && !offerSent ? 'pointer' : 'default',
                  opacity: !offerAmount ? 0.5 : 1,
                }}
              >
                {offerSent ? '✓ Sent' : 'Send'}
              </button>
            </div>

            <div style={{ fontSize: 8, color: '#6b5a80', lineHeight: 1.4, fontStyle: 'italic' }}>
              {contractLive
                ? 'Your offer will be submitted on-chain. The owner can accept and the NFT will transfer automatically.'
                : 'Interest registered. No funds taken until the contract is live.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
