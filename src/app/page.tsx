'use client';

import { useState, useEffect, useCallback } from 'react';
import { BattleFIDCard, OwnedCard } from '@/types/card';
import { fetchFaces } from '@/lib/faces';
import { fetchNeynarUsers } from '@/lib/neynar';
import { buildCard } from '@/lib/cardBuilder';
import { getCollection } from '@/lib/collection';
import BattleCard from '@/components/BattleCard';
import PackOpener from '@/components/PackOpener';
import CollectionView from '@/components/CollectionView';
import { FidTimeline } from '@/types/faces';
import { useMiniApp } from '@/hooks/useMiniApp';

type Tab = 'browse' | 'pack' | 'collection';

interface BrowseState {
  cards: BattleFIDCard[];
  totalFids: number;
  loading: boolean;
  loadingMore: boolean;
  offset: number;
}

const PAGE = 25;

async function loadPage(offset: number): Promise<{
  cards: BattleFIDCard[];
  totalFids: number;
}> {
  const res = await fetchFaces({ limit: PAGE, offset, imagesPerFid: 1, sort: 'fid', order: 'asc' });
  const fids = res.data.map((t: FidTimeline) => t.fid);
  const neynarMap = await fetchNeynarUsers(fids);
  const cards = res.data.map((tl: FidTimeline) => buildCard(tl, 0, neynarMap.get(tl.fid)));
  return { cards, totalFids: res.totalFids };
}

export default function Home() {
  const { user: miniAppUser, isInMiniApp } = useMiniApp();
  const [tab, setTab] = useState<Tab>('browse');
  const [browse, setBrowse] = useState<BrowseState>({
    cards: [], totalFids: 0, loading: true, loadingMore: false, offset: 0,
  });
  const [owned, setOwned] = useState<OwnedCard[]>([]);

  useEffect(() => {
    loadPage(0).then(({ cards, totalFids }) => {
      setBrowse({ cards, totalFids, loading: false, loadingMore: false, offset: PAGE });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setOwned(getCollection());
  }, []);

  const loadMore = useCallback(async () => {
    if (browse.loadingMore || browse.cards.length >= browse.totalFids) return;
    setBrowse((s) => ({ ...s, loadingMore: true }));
    try {
      const { cards } = await loadPage(browse.offset);
      setBrowse((s) => ({
        ...s,
        cards: [...s.cards, ...cards],
        offset: s.offset + PAGE,
        loadingMore: false,
      }));
    } catch {
      setBrowse((s) => ({ ...s, loadingMore: false }));
    }
  }, [browse.offset, browse.loadingMore, browse.totalFids, browse.cards.length]);

  function handleCollected() {
    setOwned(getCollection());
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
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
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
        {/* Browse */}
        {tab === 'browse' && (
          <div>
            {browse.loading ? (
              <div style={{ textAlign: 'center', paddingTop: 60, color: '#374151', letterSpacing: '0.2em', fontSize: 11 }}>
                Loading cards…
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: '#374151', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {browse.cards.length.toLocaleString()} of {browse.totalFids.toLocaleString()} FIDs
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 1400, margin: '0 auto' }}>
                  {browse.cards.map((card) => (
                    <BattleCard key={card.imageId} card={card} />
                  ))}
                </div>

                {browse.cards.length < browse.totalFids && (
                  <div style={{ textAlign: 'center', marginTop: 28, marginBottom: 12 }}>
                    <button
                      onClick={loadMore}
                      disabled={browse.loadingMore}
                      style={{
                        padding: '12px 28px', borderRadius: 99,
                        border: '1px solid rgba(0,212,255,0.25)',
                        cursor: browse.loadingMore ? 'default' : 'pointer',
                        background: 'transparent',
                        color: browse.loadingMore ? '#374151' : '#00d4ff',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        opacity: browse.loadingMore ? 0.5 : 1,
                      }}
                    >
                      {browse.loadingMore ? 'Loading…' : `Load More (${(browse.totalFids - browse.cards.length).toLocaleString()} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'pack' && <PackOpener onCollected={handleCollected} />}
        {tab === 'collection' && <CollectionView owned={owned} />}
      </div>

      {/* Bottom nav — fixed, safe-area aware */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(64px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
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
