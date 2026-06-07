'use client';

import { useState, useEffect, useCallback } from 'react';
import { BattleFIDCard } from '@/types/card';
import { OwnedCard } from '@/types/card';
import { fetchFaces } from '@/lib/faces';
import { fetchNeynarUsers } from '@/lib/neynar';
import { buildCard } from '@/lib/cardBuilder';
import { getCollection } from '@/lib/collection';
import BattleCard from '@/components/BattleCard';
import PackOpener from '@/components/PackOpener';
import CollectionView from '@/components/CollectionView';
import { FidTimeline } from '@/types/faces';

type Tab = 'browse' | 'pack' | 'collection';

// ── Browse state ──────────────────────────────────────────────────────────────

interface BrowseState {
  cards: BattleFIDCard[];
  totalFids: number;
  loading: boolean;
  loadingMore: boolean;
  offset: number;
}

const PAGE = 25;

async function loadPage(offset: number, timelines: FidTimeline[] = []): Promise<{
  cards: BattleFIDCard[];
  timelines: FidTimeline[];
  totalFids: number;
}> {
  const res = await fetchFaces({ limit: PAGE, offset, imagesPerFid: 1, sort: 'fid', order: 'asc' });
  const allTimelines = [...timelines, ...res.data];
  const fids = res.data.map((t) => t.fid);
  const neynarMap = await fetchNeynarUsers(fids);
  const cards = res.data.map((tl) => buildCard(tl, 0, neynarMap.get(tl.fid)));
  return { cards, timelines: allTimelines, totalFids: res.totalFids };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<Tab>('browse');
  const [browse, setBrowse] = useState<BrowseState>({
    cards: [], totalFids: 0, loading: true, loadingMore: false, offset: 0,
  });
  const [owned, setOwned] = useState<OwnedCard[]>([]);

  // Initial browse load
  useEffect(() => {
    loadPage(0).then(({ cards, totalFids }) => {
      setBrowse({ cards, totalFids, loading: false, loadingMore: false, offset: PAGE });
    }).catch(console.error);
  }, []);

  // Load collection from localStorage
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

  const tabStyle = (t: Tab) => ({
    padding: '10px 24px', borderRadius: 99, border: 'none',
    cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    transition: 'all 0.2s',
    background: tab === t
      ? 'linear-gradient(90deg, #00d4ff22, #b44fff22)'
      : 'transparent',
    color: tab === t ? '#00d4ff' : '#374151',
    borderBottom: tab === t ? '2px solid #00d4ff' : '2px solid transparent',
  });

  return (
    <main className="bg-grid min-h-screen px-4 py-8">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 42, fontWeight: 900, letterSpacing: '0.1em',
            background: 'linear-gradient(90deg, #00d4ff, #b44fff, #FFD700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', lineHeight: 1.1,
          }}
        >
          BATTLE FIDs
        </h1>
        <p style={{ color: '#374151', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 6 }}>
          Farcaster Identity Battle Cards
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 36 }}>
        <button onClick={() => setTab('browse')} style={tabStyle('browse')}>Browse</button>
        <button onClick={() => setTab('pack')} style={tabStyle('pack')}>Open Pack</button>
        <button onClick={() => setTab('collection')} style={tabStyle('collection')}>
          My Cards {owned.length > 0 && `(${owned.length})`}
        </button>
      </div>

      {/* Browse */}
      {tab === 'browse' && (
        <div>
          {browse.loading ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#374151', letterSpacing: '0.2em', fontSize: 11 }}>
              Loading cards…
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 10, color: '#374151', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {browse.cards.length.toLocaleString()} of {browse.totalFids.toLocaleString()} FIDs
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 1400, margin: '0 auto' }}>
                {browse.cards.map((card) => (
                  <BattleCard key={card.imageId} card={card} />
                ))}
              </div>

              {browse.cards.length < browse.totalFids && (
                <div style={{ textAlign: 'center', marginTop: 36 }}>
                  <button
                    onClick={loadMore}
                    disabled={browse.loadingMore}
                    style={{
                      padding: '12px 32px', borderRadius: 99,
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

      {/* Pack */}
      {tab === 'pack' && <PackOpener onCollected={handleCollected} />}

      {/* Collection */}
      {tab === 'collection' && <CollectionView owned={owned} />}
    </main>
  );
}
