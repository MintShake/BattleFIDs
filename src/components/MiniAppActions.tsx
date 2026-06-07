'use client';

import { useState } from 'react';

const APP_URL = 'https://battle-fids.vercel.app';

const btnBase: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 99,
  border: 'none',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

export default function MiniAppActions({
  isInMiniApp,
  added,
}: {
  isInMiniApp: boolean;
  added: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!isInMiniApp) return null;

  async function handleAdd() {
    setAdding(true);
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      await sdk.actions.addMiniApp();
    } catch {
      // User dismissed or already added
    } finally {
      setAdding(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      await sdk.actions.composeCast({
        text: '⚔ Battle FIDs 2026 Edition — collect Farcaster identity cards, battle for supremacy. Rome Plays.',
        embeds: [APP_URL],
      });
    } catch {
      // User dismissed cast composer
    } finally {
      setSharing(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
      padding: '6px 16px 2px',
      flexWrap: 'wrap',
    }}>
      {!added && (
        <button
          onClick={handleAdd}
          disabled={adding}
          style={{
            ...btnBase,
            background: 'linear-gradient(90deg, #8a63d2, #6d28d9)',
            color: '#fff',
            opacity: adding ? 0.6 : 1,
          }}
        >
          ＋ Add to Warpcast
        </button>
      )}
      <button
        onClick={handleShare}
        disabled={sharing}
        style={{
          ...btnBase,
          background: 'rgba(138,99,210,0.12)',
          color: '#8a63d2',
          border: '1px solid rgba(138,99,210,0.3)',
          opacity: sharing ? 0.6 : 1,
        }}
      >
        ↗ Share
      </button>
    </div>
  );
}
