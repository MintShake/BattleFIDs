'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLogs, onDebugChange, type DebugEntry } from '@/lib/debug';

export function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<DebugEntry[]>([]);

  const refresh = useCallback(() => setLogs(getLogs()), []);

  useEffect(() => {
    refresh();
    return onDebugChange(refresh);
  }, [refresh]);

  const rel = (ts: number) => `+${((ts - (logs[0]?.ts ?? ts)) / 1000).toFixed(2)}s`;

  return (
    <>
      {/* Tap target — bottom-left corner, small, out of the way */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 72, left: 8, zIndex: 9999,
          width: 28, height: 28, borderRadius: 6,
          background: open ? 'rgba(138,99,210,0.4)' : 'rgba(138,99,210,0.15)',
          border: '1px solid rgba(138,99,210,0.4)',
          color: '#a08cc0', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', minHeight: 0, padding: 0,
        }}
        aria-label="Toggle debug log"
      >
        {open ? '✕' : '⌬'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 108, left: 8, right: 8, zIndex: 9998,
          maxHeight: '55dvh', overflowY: 'auto',
          background: 'rgba(7,2,14,0.96)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(138,99,210,0.3)', borderRadius: 12,
          padding: '10px 12px',
        }}>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: '#a08cc0', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Debug · {logs.length} entries
          </p>
          {logs.length === 0 && (
            <p style={{ fontSize: 10, color: '#7a6a90' }}>No logs yet</p>
          )}
          {[...logs].reverse().map((e, i) => (
            <div key={i} style={{ fontSize: 10, color: '#e0d4f0', marginBottom: 4, lineHeight: 1.4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              <span style={{ color: '#6b5a80', marginRight: 6 }}>{rel(e.ts)}</span>
              {e.msg}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
