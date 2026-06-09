'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import BattleCard from '@/components/BattleCard';
import CardModal from '@/components/CardModal';
import { isContractDeployed } from '@/lib/contract';
import type { BattleFIDCard, OwnedCard } from '@/types/card';
import type { NeynarUser } from '@/types/neynar';

interface ProfileCard {
  pfp_url: string;
  pfp_urls: string[];
  thumb_url: string;
  stored_at: string;
  like_count: number;
  has_badge: boolean;
  battle_score: number;
  rarity: string;
  display_name: string;
  handle: string;
}

const RARITY_COLOR: Record<string, string> = {
  Alpha: '#ff9f0a', Legendary: '#bf5af2', Elite: '#30d158',
  Rare: '#0a84ff', Common: '#8e8e93',
};

export default function ProfilePage() {
  const params  = useParams();
  const fidParam = Array.isArray(params.fid) ? params.fid[0] : params.fid;
  const fid = parseInt(fidParam ?? '');

  const [neynarUser, setNeynarUser] = useState<NeynarUser | null>(null);
  const [profileCards, setProfileCards] = useState<ProfileCard[]>([]);
  const [ownedCards, setOwnedCards]     = useState<OwnedCard[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState<{ card: BattleFIDCard; serialNumber?: number } | null>(null);
  const contractLive = isContractDeployed();

  useEffect(() => {
    if (isNaN(fid)) { setLoading(false); return; }

    Promise.all([
      fetch(`/api/profile/${fid}`).then(r => r.json()).catch(() => ({ cards: [], neynarUser: null })),
      fetch(`/api/packs?ownerFid=${fid}`).then(r => r.json()).catch(() => []),
    ]).then(([profileData, owned]) => {
      setNeynarUser(profileData.neynarUser ?? null);
      setProfileCards(profileData.cards ?? []);
      setOwnedCards(Array.isArray(owned) ? owned : []);
    }).finally(() => setLoading(false));
  }, [fid]);

  if (isNaN(fid)) return (
    <div style={SCREEN}>
      <p style={{ color: '#a08cc0', fontSize: 11 }}>Invalid FID</p>
    </div>
  );

  if (loading) return (
    <div style={SCREEN}>
      <p style={{ color: '#7a6a90', fontSize: 11, letterSpacing: '0.15em' }}>Loading…</p>
    </div>
  );

  const displayName = neynarUser?.display_name ?? profileCards[0]?.display_name ?? `FID ${fid}`;
  const handle      = neynarUser?.username    ?? profileCards[0]?.handle        ?? '';
  const pfpUrl      = neynarUser?.pfp_url     ?? profileCards[0]?.pfp_url       ?? '';
  const bio         = neynarUser?.profile?.bio?.text ?? '';
  const rarity      = profileCards[0]?.rarity ?? 'Common';
  const rarityColor = RARITY_COLOR[rarity] ?? '#8e8e93';

  // Build BattleFIDCard from ProfileCard for BattleCard component
  function toCard(pc: ProfileCard): BattleFIDCard {
    return {
      fid,
      pfpUrl:   pc.pfp_url,
      pfpUrls:  pc.pfp_urls ?? [],
      pfpCount: (pc.pfp_urls ?? []).length,
      thumbUrl: pc.thumb_url,
      handle,
      displayName,
      maxSupply: fid,
      rarity:    pc.rarity as BattleFIDCard['rarity'],
      stats: { supplyRarity: 0, followerPower: 0, neynarForce: 0, castActivity: 0, badgeScore: 0, pfpFreshness: 0, xploraXP: 0 },
      battleScore: pc.battle_score,
      cardType:    'NETWORKER',
      wins: 0, losses: 0,
      storedAt:  pc.stored_at,
      likeCount: pc.like_count,
      hasBadge:  pc.has_badge,
    };
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#07020e', padding: '0 0 60px' }}>

      {/* Back */}
      <div style={{ padding: '16px 16px 0' }}>
        <a href="/" style={{ fontSize: 9, color: '#7a6a90', letterSpacing: '0.2em', textDecoration: 'none', textTransform: 'uppercase' }}>
          ← The Protocol
        </a>
      </div>

      {/* Identity header */}
      <div style={{ padding: '20px 16px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {pfpUrl && (
          <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: `2px solid ${rarityColor}40` }}>
            <Image src={pfpUrl} alt={displayName} width={60} height={60} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: '#e0d4f0', margin: 0, letterSpacing: '0.04em' }}>{displayName}</h1>
            {neynarUser?.power_badge && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(191,90,242,0.15)', color: '#bf5af2', fontWeight: 700 }}>⚡ POWER</span>}
          </div>
          {handle && <p style={{ fontSize: 11, color: '#a08cc0', margin: '2px 0 0', letterSpacing: '0.08em' }}>@{handle} · FID {fid}</p>}
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            {neynarUser?.follower_count != null && (
              <span style={{ fontSize: 10, color: '#7a6a90' }}>
                <span style={{ color: '#8a63d2', fontWeight: 700 }}>{fmt(neynarUser.follower_count)}</span> followers
              </span>
            )}
            {neynarUser?.following_count != null && (
              <span style={{ fontSize: 10, color: '#7a6a90' }}>
                <span style={{ color: '#8a63d2', fontWeight: 700 }}>{fmt(neynarUser.following_count)}</span> following
              </span>
            )}
          </div>
          {bio && <p style={{ fontSize: 10, color: '#a08cc0', marginTop: 6, lineHeight: 1.4 }}>{bio}</p>}
        </div>
      </div>

      {/* Rarity badge */}
      <div style={{ padding: '0 16px 20px' }}>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', padding: '3px 10px', borderRadius: 99, border: `1px solid ${rarityColor}40`, color: rarityColor, background: `${rarityColor}10` }}>
          {rarity.toUpperCase()} TIER
        </span>
      </div>

      {/* Their BattleFID cards */}
      {profileCards.length > 0 && (
        <section style={{ padding: '0 16px 24px' }}>
          <p style={SECTION_LABEL}>Their BattleFID Card{profileCards.length > 1 ? 's' : ''}</p>
          <div className="card-grid">
            {profileCards.map(pc => {
              const card = toCard(pc);
              return (
                <div key={fid} style={{ position: 'relative' }}>
                  <BattleCard
                    card={card}
                    onClick={() => setModal({ card })}
                  />
                  {/* NFT mint status */}
                  <div style={{ marginTop: 6, textAlign: 'center' }}>
                    {contractLive ? (
                      <span style={{ fontSize: 8, color: '#22c55e', letterSpacing: '0.12em' }}>⬡ MINTED</span>
                    ) : (
                      <span style={{ fontSize: 8, color: '#7a6a90', letterSpacing: '0.12em' }}>◌ NOT MINTED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {profileCards.length === 0 && (
        <section style={{ padding: '0 16px 24px' }}>
          <p style={SECTION_LABEL}>BattleFID Card</p>
          <div style={{ padding: '24px 0', textAlign: 'center', border: '1px dashed rgba(138,99,210,0.15)', borderRadius: 16 }}>
            <p style={{ fontSize: 11, color: '#7a6a90', letterSpacing: '0.1em' }}>No card minted yet</p>
            <p style={{ fontSize: 9, color: '#6b5a80', marginTop: 4 }}>Open a pack to mint your card</p>
          </div>
        </section>
      )}

      {/* Their collection */}
      {ownedCards.length > 0 && (
        <section style={{ padding: '0 16px' }}>
          <p style={SECTION_LABEL}>Collection · {ownedCards.length} card{ownedCards.length !== 1 ? 's' : ''}</p>
          <div className="card-grid">
            {ownedCards.map((oc, i) => (
              <BattleCard
                key={`${oc.card.fid}-${i}`}
                card={oc.card}
                serialNumber={oc.serialNumber}
                onClick={() => setModal({ card: oc.card, serialNumber: oc.serialNumber })}
              />
            ))}
          </div>
        </section>
      )}

      {modal && (
        <CardModal
          card={modal.card}
          serialNumber={modal.serialNumber}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const SCREEN: React.CSSProperties = {
  minHeight: '100dvh', background: '#07020e',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.25em',
  color: '#a08cc0', textTransform: 'uppercase', marginBottom: 12,
};
