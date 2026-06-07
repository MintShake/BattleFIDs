'use client';

import { useState, useEffect } from 'react';
import { OwnedCard } from '@/types/card';
import { fetchCollection } from '@/lib/collection';
import BattleCard from '@/components/BattleCard';
import PackOpener from '@/components/PackOpener';
import CollectionView from '@/components/CollectionView';
import MiniAppActions from '@/components/MiniAppActions';
import { useMiniApp } from '@/hooks/useMiniApp';

type Tab = 'browse' | 'pack' | 'collection';

// Global browse — all cards opened by anyone
interface GlobalCard { ownedCard: OwnedCard; ownerHandle?: string; }

async function fetchGlobalCards(): Promise<GlobalCard[]> {
  const res = await fetch('/api/browse');
  if (!res.ok) return [];
  return res.json();
}

export default function Home() {
  const { user: miniAppUser, safeAreaInsets, isInMiniApp, added } = useMiniApp();
  const [tab, setTab] = useState<Tab>('browse');
  const [owned, setOwned] = useState<OwnedCard[]>([]);
  const [globalCards, setGlobalCards] = useState<GlobalCard[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  // Load user's own collection
  useEffect(() => {
    fetchCollection(miniAppUser?.fid).then(setOwned).catch(() => {});
  }, [miniAppUser?.fid]);

  // Load global browse on mount
  useEffect(() => {
    fetchGlobalCards().then((cards) => {
      setGlobalCards(cards);
      setBrowseLoading(false);
    }).catch(() => setBrowseLoading(false));
  }, []);

  function handleCollected() {
    fetchCollection(miniAppUser?.fid).then(setOwned).catch(() => {});
    fetchGlobalCards().then(setGlobalCards).catch(() => {});
    setTab('collection');
  }

  const TAB_ICONS: Record<Tab, string> = { browse: '🃏', pack: '📦', collection: '⚔' };
  const TAB_LABELS: Record<Tab, string> = { browse: 'Browse', pack: 'Open Pack', collection: 'My Cards' };

  return (
    <main
      className="bg-grid min-h-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingTop: safeAreaInsets.top,
        paddingBottom: 64 + safeAreaInsets.bottom,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '16px 16px 4px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 180, height: 28,
          borderRadius: '0 0 90px 90px',
          background: 'linear-gradient(180deg, rgba(138,99,210,0.08) 0%, transparent 100%)',
          border: '1px solid rgba(138,99,210,0.12)',
          borderTop: 'none',
          pointerEvents: 'none',
        }} />

        <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', color: '#5c4070', textTransform: 'uppercase', margin: '0 0 3px' }}>
          2026 EDITION
        </p>
        <h1 style={{
          fontSize: 'clamp(24px, 7vw, 42px)',
          fontWeight: 900, letterSpacing: '0.1em',
          background: 'linear-gradient(90deg, #8a63d2, #C9A84C, #8a63d2)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', lineHeight: 1.05, margin: 0,
        }}>
          BATTLE FIDs
        </h1>
        {miniAppUser ? (
          <p style={{ color: '#5c4d70', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
            FID {miniAppUser.fid} · @{miniAppUser.username ?? miniAppUser.displayName}
          </p>
        ) : (
          <p style={{ color: '#3d3050', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 4 }}>
            Farcaster Identity Battle Cards
          </p>
        )}
      </div>

      {/* Add + Share buttons */}
      <MiniAppActions isInMiniApp={isInMiniApp} added={added} />

      {/* Content area */}
      <div className="scroll-area" style={{ flex: 1, padding: '8px 12px 0' }}>

        {/* Browse — all cards opened by anyone */}
        {tab === 'browse' && (
          browseLoading ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#3d3050', fontSize: 11, letterSpacing: '0.2em' }}>
              Loading…
            </div>
          ) : globalCards.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🃏</div>
              <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5c4070' }}>
                No cards discovered yet
              </p>
              <p style={{ fontSize: 10, color: '#3d3050', marginTop: 8 }}>
                Be the first — open a pack
              </p>
              <button
                onClick={() => setTab('pack')}
                style={{
                  marginTop: 20, padding: '12px 28px', borderRadius: 99,
                  border: '1px solid rgba(138,99,210,0.3)',
                  background: 'transparent', color: '#8a63d2',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Open a Pack
              </button>
            </div>
          ) : (
            <>
              <p style={{ textAlign: 'center', fontSize: 9, color: '#3d3050', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
                {globalCards.length} card{globalCards.length !== 1 ? 's' : ''} in circulation
              </p>
              <div className="card-grid">
                {globalCards.map((gc, i) => (
                  <BattleCard
                    key={`${gc.ownedCard.card.imageId}-${i}`}
                    card={gc.ownedCard.card}
                    serialNumber={gc.ownedCard.serialNumber}
                    ownerHandle={gc.ownerHandle}
                  />
                ))}
              </div>
            </>
          )
        )}

        {tab === 'pack' && <PackOpener onCollected={handleCollected} ownerFid={miniAppUser?.fid} />}
        {tab === 'collection' && <CollectionView owned={owned} />}
      </div>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 64 + safeAreaInsets.bottom,
        paddingBottom: safeAreaInsets.bottom,
        background: 'rgba(9,4,15,0.94)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(138,99,210,0.18)',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-around',
        zIndex: 100,
      }}>
        {(['browse', 'pack', 'collection'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, height: 64,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'none', border: 'none',
              color: tab === t ? '#8a63d2' : '#4a3d5c',
              transition: 'color 0.15s',
              minHeight: 44,
            }}
          >
            <span style={{ fontSize: 20 }}>{TAB_ICONS[t]}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t === 'collection' && owned.length > 0 ? `${TAB_LABELS[t]} (${owned.length})` : TAB_LABELS[t]}
            </span>
          </button>
        ))}
      </nav>
    </main>
  );
}
