'use client';

import { useState, useEffect } from 'react';
import { OwnedCard } from '@/types/card';
import { fetchCollection } from '@/lib/collection';
import BattleCard from '@/components/BattleCard';
import PackOpener from '@/components/PackOpener';
import CollectionView from '@/components/CollectionView';
import { useMiniApp } from '@/hooks/useMiniApp';

type Tab = 'browse' | 'pack' | 'collection';

export default function Home() {
  const { user: miniAppUser, safeAreaInsets } = useMiniApp();
  const [tab, setTab] = useState<Tab>('pack');
  const [owned, setOwned] = useState<OwnedCard[]>([]);

  useEffect(() => {
    fetchCollection(miniAppUser?.fid).then(setOwned).catch(() => {});
  }, [miniAppUser?.fid]);

  function handleCollected() {
    fetchCollection(miniAppUser?.fid).then(setOwned).catch(() => {});
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
      <div style={{ textAlign: 'center', padding: '20px 16px 6px', position: 'relative' }}>
        {/* Arch decoration */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 180, height: 28,
          borderRadius: '0 0 90px 90px',
          background: 'linear-gradient(180deg, rgba(138,99,210,0.08) 0%, transparent 100%)',
          border: '1px solid rgba(138,99,210,0.12)',
          borderTop: 'none',
          pointerEvents: 'none',
        }} />

        <p style={{
          fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', color: '#5c4070',
          textTransform: 'uppercase', margin: '0 0 4px',
        }}>
          2026 EDITION
        </p>

        <h1 style={{
          fontSize: 'clamp(28px, 8vw, 44px)',
          fontWeight: 900,
          letterSpacing: '0.1em',
          background: 'linear-gradient(90deg, #8a63d2, #C9A84C, #8a63d2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.05,
          margin: 0,
        }}>
          BATTLE FIDs
        </h1>

        {miniAppUser ? (
          <p style={{ color: '#5c4d70', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 5 }}>
            FID {miniAppUser.fid} · {miniAppUser.username ?? miniAppUser.displayName}
          </p>
        ) : (
          <p style={{ color: '#3d3050', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 5 }}>
            Farcaster Identity Battle Cards
          </p>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, padding: '8px 12px 0', overflowY: 'auto' }}>
        {/* Browse — only cards won from packs */}
        {tab === 'browse' && (
          <div>
            {owned.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 80, color: '#374151' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🃏</div>
                <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  No cards discovered yet
                </p>
                <p style={{ fontSize: 10, color: '#4b5563', marginTop: 8 }}>
                  Cards only appear here after being won from a pack
                </p>
                <button
                  onClick={() => setTab('pack')}
                  style={{
                    marginTop: 24, padding: '12px 28px', borderRadius: 99,
                    border: '1px solid rgba(0,212,255,0.3)',
                    background: 'transparent', color: '#00d4ff',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  Open a Pack
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: '#374151', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {owned.length} card{owned.length !== 1 ? 's' : ''} discovered
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 1400, margin: '0 auto' }}>
                  {owned.map((oc, i) => (
                    <BattleCard key={`${oc.card.imageId}-${i}`} card={oc.card} serialNumber={oc.serialNumber} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'pack' && <PackOpener onCollected={handleCollected} ownerFid={miniAppUser?.fid} />}
        {tab === 'collection' && <CollectionView owned={owned} />}
      </div>

      {/* Bottom nav — fixed, safe-area aware */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64 + safeAreaInsets.bottom,
          paddingBottom: safeAreaInsets.bottom,
          background: 'rgba(9,4,15,0.94)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(138,99,210,0.18)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-around',
          paddingTop: 0,
          zIndex: 100,
        }}
      >
        {(['browse', 'pack', 'collection'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              height: 64,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tab === t ? '#8a63d2' : '#4a3d5c',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 20 }}>{TAB_ICONS[t]}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {t === 'collection' && owned.length > 0 ? `${TAB_LABELS[t]} (${owned.length})` : TAB_LABELS[t]}
            </span>
          </button>
        ))}
      </nav>
    </main>
  );
}
