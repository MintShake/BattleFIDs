'use client';

import { useState, useEffect, useMemo } from 'react';
import { OwnedCard, BattleFIDCard } from '@/types/card';
import { fetchCollection } from '@/lib/collection';
import BattleCard from '@/components/BattleCard';
import CardModal from '@/components/CardModal';
import PackOpener from '@/components/PackOpener';
import CollectionView from '@/components/CollectionView';
import MiniAppActions from '@/components/MiniAppActions';
import TeamBuilder from '@/components/TeamBuilder';
import WeekProgress from '@/components/WeekProgress';
import Leaderboard from '@/components/Leaderboard';
import EditionSelect from '@/components/EditionSelect';
import { EditionBackdrop } from '@/components/EditionBackdrop';
import { DebugOverlay } from '@/components/DebugOverlay';
import { useMiniApp } from '@/hooks/useMiniApp';
import { useWallet } from '@/hooks/useWallet';
import { isAdminAddress } from '@/lib/adminAuth';
import { EditionProvider, readStoredEditionId, writeEditionId, STATIC_EDITIONS } from '@/editions/context';
import { useEdition } from '@/editions/context';
import { EditionHeaderOverlay } from '@/editions/EditionHeaderOverlay';
import { dbToEdition, type DbEditionRow } from '@/lib/editionDb';
import type { Edition } from '@/editions/types';

type Tab = 'browse' | 'pack' | 'collection' | 'league';
type LeagueView = 'team' | 'progress' | 'leaderboard';
type BrowseSort = 'recent' | 'score' | 'fid' | 'name';

interface GlobalCard { ownedCard: OwnedCard; ownerHandle?: string; }

async function fetchGlobalCards(): Promise<GlobalCard[]> {
  const res = await fetch('/api/browse');
  if (!res.ok) return [];
  return res.json();
}

// ── Inner app — wrapped by EditionProvider ────────────────────────────────────
function AppInner({
  onChangeEdition,
}: {
  onChangeEdition: () => void;
}) {
  const edition = useEdition();
  const { user: miniAppUser, safeAreaInsets, isInMiniApp, added } = useMiniApp();
  const { address: walletAddress, fid: walletFid, connected: walletConnected, connecting, connect } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin check — wallet address (direct) or FID (Neynar lookup via sessionStorage)
  useEffect(() => {
    // Direct wallet address check — no API call needed
    if (walletAddress && isAdminAddress(walletAddress)) { setIsAdmin(true); return; }

    // FID-based check (miniapp context or wallet-resolved FID)
    let fid: string | null = null;
    try { fid = sessionStorage.getItem('miniapp_fid'); } catch { /* noop */ }
    if (!fid) return;
    fetch(`/api/admin/check?fid=${fid}`)
      .then(r => r.json())
      .then((d: { authorized: boolean }) => { if (d.authorized) setIsAdmin(true); })
      .catch(() => {});
  }, [walletAddress]);
  const [tab, setTab]               = useState<Tab>('browse');
  const [leagueView, setLeagueView] = useState<LeagueView>('progress');
  const deviceId = typeof window !== 'undefined'
    ? (localStorage.getItem('deviceId') ?? (() => { const id = crypto.randomUUID(); localStorage.setItem('deviceId', id); return id; })())
    : '';
  const [owned, setOwned]           = useState<OwnedCard[]>([]);
  const [globalCards, setGlobalCards] = useState<GlobalCard[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseSearch, setBrowseSearch]   = useState('');
  const [browseSort, setBrowseSort]       = useState<BrowseSort>('recent');
  const [modalCard, setModalCard]   = useState<{ card: BattleFIDCard; serialNumber?: number; ownerHandle?: string } | null>(null);

  useEffect(() => {
    fetchCollection(miniAppUser?.fid).then(setOwned).catch(() => {});
  }, [miniAppUser?.fid]);

  useEffect(() => {
    fetchGlobalCards().then(cards => { setGlobalCards(cards); setBrowseLoading(false); })
      .catch(() => setBrowseLoading(false));
  }, []);

  function handleCollected() {
    fetchCollection(miniAppUser?.fid).then(setOwned).catch(() => {});
    fetchGlobalCards().then(setGlobalCards).catch(() => {});
    setTab('collection');
  }

  const filteredBrowse = useMemo(() => {
    const q = browseSearch.toLowerCase().trim();
    let list = q
      ? globalCards.filter(({ ownedCard: { card } }) =>
          card.handle.toLowerCase().includes(q) ||
          card.displayName.toLowerCase().includes(q) ||
          String(card.fid).includes(q))
      : [...globalCards];
    switch (browseSort) {
      case 'score': list.sort((a, b) => b.ownedCard.card.battleScore - a.ownedCard.card.battleScore); break;
      case 'fid':   list.sort((a, b) => a.ownedCard.card.fid - b.ownedCard.card.fid); break;
      case 'name':  list.sort((a, b) => a.ownedCard.card.handle.localeCompare(b.ownedCard.card.handle)); break;
    }
    return list;
  }, [globalCards, browseSearch, browseSort]);

  const TAB_ICONS:  Record<Tab, string> = { browse: '🃏', pack: '📦', collection: '⚔', league: '🏆' };
  const TAB_LABELS: Record<Tab, string> = { browse: 'Browse', pack: 'Open Pack', collection: 'My Cards', league: 'League' };

  return (
    <>
    <EditionBackdrop />
    <DebugOverlay />
    <main className={`${edition.theme.bgClass} min-h-screen`} style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        className="page-inner"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          paddingTop: safeAreaInsets.top,
          paddingBottom: 64 + safeAreaInsets.bottom,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', padding: '16px 16px 4px', position: 'relative' }}>
          {/* Right controls: admin gear + wallet connect (browser only) */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isInMiniApp && (
              walletConnected ? (
                <a
                  href={walletFid ? `/profile/${walletFid}` : '#'}
                  style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                    padding: '5px 10px', borderRadius: 99,
                    border: '1px solid rgba(201,168,76,0.35)',
                    background: 'rgba(201,168,76,0.06)',
                    color: '#C9A84C', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                  {walletFid ? `FID ${walletFid}` : 'Connected'}
                </a>
              ) : (
                <button
                  onClick={connect}
                  disabled={connecting}
                  style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                    padding: '5px 10px', borderRadius: 99,
                    border: '1px solid rgba(138,99,210,0.3)',
                    background: 'transparent', color: '#8a63d2', cursor: 'pointer',
                  }}
                >
                  {connecting ? '…' : '⬡ Connect'}
                </button>
              )
            )}
            {isAdmin && (
              <a
                href="/admin/editions"
                style={{
                  fontSize: 16, lineHeight: 1, color: '#a08cc0',
                  textDecoration: 'none', minWidth: 44, minHeight: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ⚙
              </a>
            )}
          </div>
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 180, height: 28, borderRadius: '0 0 90px 90px',
            background: 'linear-gradient(180deg, rgba(138,99,210,0.08) 0%, transparent 100%)',
            border: '1px solid rgba(138,99,210,0.12)', borderTop: 'none', pointerEvents: 'none',
          }} />

          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.4em', color: '#a08cc0', textTransform: 'uppercase', margin: '0 0 3px' }}>
            {edition.theme.headerEra}
          </p>

          {/* Title + edition overlay */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h1 style={{
              fontSize: 'clamp(24px, 5vw, 48px)',
              fontWeight: 900, letterSpacing: '0.1em',
              background: 'linear-gradient(90deg, #8a63d2, #C9A84C, #8a63d2)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.05, margin: 0,
            }}>
              THE PROTOCOL
            </h1>
            <EditionHeaderOverlay />
          </div>

          {/* Edition switcher pill */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={onChangeEdition}
              style={{
                fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
                padding: '4px 12px', borderRadius: 99,
                background: `${edition.theme.accentPrimary}12`,
                border: `1px solid ${edition.theme.accentPrimary}35`,
                color: edition.theme.accentPrimary,
                cursor: 'pointer',
              }}
            >
              {edition.name} ↗
            </button>
          </div>

          {miniAppUser ? (
            <a
              href={`/profile/${miniAppUser.fid}`}
              style={{ color: '#a08cc0', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4, display: 'block', textDecoration: 'none' }}
            >
              FID {miniAppUser.fid} · @{miniAppUser.username ?? miniAppUser.displayName}
            </a>
          ) : (
            <p style={{ color: '#7a6a90', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 4 }}>
              Farcaster Identity Battle Cards
            </p>
          )}
        </div>

        <MiniAppActions isInMiniApp={isInMiniApp} added={added} />

        <div style={{ flex: 1, padding: '8px 16px 0' }}>
          {tab === 'browse' && (
            browseLoading ? (
              <div style={{ textAlign: 'center', paddingTop: 60, color: '#7a6a90', fontSize: 11, letterSpacing: '0.2em' }}>Loading…</div>
            ) : globalCards.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🃏</div>
                <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a08cc0' }}>No cards discovered yet</p>
                <p style={{ fontSize: 10, color: '#7a6a90', marginTop: 8 }}>Be the first — open a pack</p>
                <button onClick={() => setTab('pack')} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 99, border: '1px solid rgba(138,99,210,0.3)', background: 'transparent', color: '#8a63d2', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Open a Pack
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="search"
                    value={browseSearch}
                    onChange={e => setBrowseSearch(e.target.value)}
                    placeholder="Search by name or FID…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(138,99,210,0.2)', background: 'rgba(138,99,210,0.06)', color: '#e0d4f0', fontSize: 12, outline: 'none', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {(['recent', 'score', 'fid', 'name'] as BrowseSort[]).map(s => (
                      <button key={s} onClick={() => setBrowseSort(s)} style={{ padding: '5px 12px', borderRadius: 99, border: browseSort === s ? '1px solid #8a63d2' : '1px solid rgba(138,99,210,0.2)', background: browseSort === s ? 'rgba(138,99,210,0.18)' : 'transparent', color: browseSort === s ? '#c4a4ff' : '#a08cc0', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                        {s === 'recent' ? 'NEW' : s === 'score' ? 'SCORE' : s === 'fid' ? 'FID' : 'A–Z'}
                      </button>
                    ))}
                  </div>
                </div>
                <p style={{ textAlign: 'center', fontSize: 9, color: '#7a6a90', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
                  {filteredBrowse.length}{filteredBrowse.length !== globalCards.length ? ` of ${globalCards.length}` : ''} card{filteredBrowse.length !== 1 ? 's' : ''} in circulation
                </p>
                {filteredBrowse.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#a08cc0', marginTop: 40 }}>No cards match "{browseSearch}"</p>
                )}
                <div className="card-grid">
                  {filteredBrowse.map((gc, i) => (
                    <BattleCard
                      key={`${gc.ownedCard.card.fid}-${i}`}
                      card={gc.ownedCard.card}
                      serialNumber={gc.ownedCard.serialNumber}
                      ownerHandle={gc.ownerHandle}
                      onClick={() => setModalCard({ card: gc.ownedCard.card, serialNumber: gc.ownedCard.serialNumber, ownerHandle: gc.ownerHandle })}
                    />
                  ))}
                </div>
              </>
            )
          )}

          {tab === 'pack' && <PackOpener onCollected={handleCollected} ownerFid={miniAppUser?.fid} isInMiniApp={isInMiniApp} />}
          {tab === 'collection' && <CollectionView owned={owned} />}

          {tab === 'league' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
                {(['progress', 'team', 'leaderboard'] as LeagueView[]).map(v => (
                  <button key={v} onClick={() => setLeagueView(v)} style={{ padding: '6px 14px', borderRadius: 99, border: leagueView === v ? '1px solid #8a63d2' : '1px solid rgba(138,99,210,0.2)', background: leagueView === v ? 'rgba(138,99,210,0.18)' : 'transparent', color: leagueView === v ? '#c4a4ff' : '#a08cc0', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {v === 'progress' ? 'My Week' : v === 'team' ? 'My Team' : 'Leaderboard'}
                  </button>
                ))}
              </div>
              {leagueView === 'progress'     && <WeekProgress ownerFid={miniAppUser?.fid} ownerDevice={deviceId} onGoToTeam={() => setLeagueView('team')} />}
              {leagueView === 'team'         && <TeamBuilder owned={owned} ownerFid={miniAppUser?.fid} ownerDevice={deviceId} />}
              {leagueView === 'leaderboard'  && <Leaderboard ownerFid={miniAppUser?.fid} />}
            </div>
          )}
        </div>
      </div>

      {modalCard && (
        <CardModal card={modalCard.card} serialNumber={modalCard.serialNumber} ownerHandle={modalCard.ownerHandle} onClose={() => setModalCard(null)} />
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64 + safeAreaInsets.bottom, background: 'rgba(9,4,15,0.94)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(138,99,210,0.18)', zIndex: 100 }}>
        <div className="page-inner" style={{ height: '100%', paddingBottom: safeAreaInsets.bottom, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around' }}>
          {(['browse', 'pack', 'collection', 'league'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', color: tab === t ? '#8a63d2' : '#7a6a90', transition: 'color 0.15s', minHeight: 44 }}>
              <span style={{ fontSize: 20 }}>{TAB_ICONS[t]}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {t === 'collection' && owned.length > 0 ? `${TAB_LABELS[t]} (${owned.length})` : TAB_LABELS[t]}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </main>
    </>
  );
}

// ── Root page — handles edition selection ─────────────────────────────────────
export default function Home() {
  const [dbEditions, setDbEditions] = useState<Edition[]>([]);
  const [editionId, setEditionId]   = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch('/api/editions')
      .then(r => r.json())
      .then(({ editions, defaultId }: { editions: DbEditionRow[]; defaultId: string }) => {
        const eds = editions.map(dbToEdition);
        setDbEditions(eds);

        const stored = readStoredEditionId();
        const validIds = new Set(eds.map(e => e.id));
        setEditionId(validIds.has(stored) ? stored : (defaultId ?? 'base'));
      })
      .catch(() => {
        // Fallback to static editions
        setDbEditions(Object.values(STATIC_EDITIONS));
        setEditionId(readStoredEditionId());
      });
  }, []);

  function selectEdition(id: string) {
    writeEditionId(id);
    setEditionId(id);
    setShowPicker(false);
  }

  // Still loading
  if (editionId === null) return null;

  const allEditions = dbEditions.length > 0 ? dbEditions : Object.values(STATIC_EDITIONS);
  const resolvedEdition = allEditions.find(e => e.id === editionId)
    ?? STATIC_EDITIONS[editionId]
    ?? Object.values(STATIC_EDITIONS)[0];

  if (showPicker) {
    return (
      <EditionSelect
        editions={allEditions}
        onSelect={selectEdition}
        currentId={editionId}
      />
    );
  }

  return (
    <EditionProvider edition={resolvedEdition}>
      <AppInner onChangeEdition={() => setShowPicker(true)} />
    </EditionProvider>
  );
}
