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
      <div style={{ textAlign: 'center', padding: '24px 16px 8px' }}>
        <h1
          style={{
            fontSize: 'clamp(28px, 8vw, 42px)',
            fontWeight: 900,
            letterSpacing: '0.08em',
            background: 'linear-gradient(90deg, #00d4ff, #b44fff, #FFD700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          BATTLE FIDs
        </h1>
        {miniAppUser ? (
          <p style={{ color: '#4b5563', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
            FID {miniAppUser.fid} · {miniAppUser.username ?? miniAppUser.displayName}
          </p>
        ) : (
          <p style={{ color: '#374151', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 4 }}>
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
          background: 'rgba(5,12,24,0.92)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0,212,255,0.12)',
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
              color: tab === t ? '#00d4ff' : '#4b5563',
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
