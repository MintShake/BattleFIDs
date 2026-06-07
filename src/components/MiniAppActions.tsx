'use client';

import { useState, useEffect, useRef } from 'react';

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
  added: addedProp,
}: {
  isInMiniApp: boolean;
  added: boolean;
}) {
  // Track added locally so we can update it when the SDK fires the event
  const [added, setAdded] = useState(addedProp);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  // Hold pre-loaded sdk so click handler is instant (no dynamic import delay)
  const sdkRef = useRef<Awaited<typeof import('@farcaster/miniapp-sdk')>['sdk'] | null>(null);

  useEffect(() => { setAdded(addedProp); }, [addedProp]);

  // Pre-load SDK and wire miniAppAdded event while in mini app context
  useEffect(() => {
    if (!isInMiniApp) return;
    let cancelled = false;
    import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      if (cancelled) return;
      sdkRef.current = sdk;
      // Listen for successful add so we hide the button immediately
      sdk.on('miniAppAdded', () => setAdded(true));
      sdk.on('miniAppAddRejected', () => setAdding(false));
    });
    return () => { cancelled = true; };
  }, [isInMiniApp]);

  if (!isInMiniApp) return null;

  async function handleAdd() {
    setAdding(true);
    setAddError(null);
    try {
      const sdk = sdkRef.current;
      if (!sdk) throw new Error('SDK not loaded');
      await sdk.actions.addMiniApp();
      setAdded(true);
    } catch (e: unknown) {
      // RejectedByUser is fine — user dismissed. Surface anything else.
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('rejected')) {
        setAddError(msg.replace('Error: ', '').slice(0, 80));
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const sdk = sdkRef.current;
      if (!sdk) throw new Error('SDK not loaded');
      await sdk.actions.composeCast({
        text: '⚔ Battle FIDs 2026 Edition — collect Farcaster identity cards, battle for supremacy. Rome Plays.',
        embeds: [APP_URL],
      });
    } catch {
      // dismissed
    } finally {
      setSharing(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 16px 2px' }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
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
            {adding ? '…' : '＋'} Add to Farcaster
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
      {addError && (
        <p style={{ fontSize: 9, color: '#ef4444', marginTop: 4, letterSpacing: '0.05em' }}>
          {addError}
        </p>
      )}
    </div>
  );
}
