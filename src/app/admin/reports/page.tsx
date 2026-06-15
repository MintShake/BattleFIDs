'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { isAdminAddress } from '@/lib/adminAuth';

interface Report {
  id: number;
  fid: number;
  image_url: string;
  reason: string | null;
  reporter_fid: number | null;
  reported_at: string;
  resolved: boolean;
  resolution: string | null;
}

export default function AdminReportsPage() {
  const [custody, setCustody]       = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [reports, setReports]       = useState<Report[]>([]);
  const [filter, setFilter]         = useState<'pending' | 'all'>('pending');
  const [acting, setActing]         = useState<number | null>(null);
  const [msg, setMsg]               = useState('');

  // Auth — mirrors /admin/editions
  useEffect(() => {
    async function check() {
      let walletAddr: string | null = null;
      try { walletAddr = sessionStorage.getItem('wallet_address'); } catch { /* noop */ }
      if (walletAddr && isAdminAddress(walletAddr)) {
        setCustody(walletAddr);
        setAuthorized(true);
        setLoading(false);
        return;
      }

      let fid: string | null = null;
      try { fid = sessionStorage.getItem('miniapp_fid'); } catch { /* noop */ }
      if (!fid) { setLoading(false); return; }

      try {
        const res  = await fetch(`/api/admin/check?fid=${fid}`);
        const data = await res.json() as { authorized: boolean; custody: string | null };
        setCustody(data.custody ?? null);
        setAuthorized(data.authorized);
      } catch { /* noop */ }
      finally { setLoading(false); }
    }
    check();
  }, []);

  function loadReports() {
    if (!custody) return;
    fetch('/api/admin/reports', { headers: { 'x-wallet-address': custody } })
      .then(r => r.json())
      .then(d => setReports(d.reports ?? []));
  }

  useEffect(() => {
    if (authorized) loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  async function resolve(id: number, action: 'dismiss' | 'block') {
    if (!custody) return;
    setActing(id);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': custody },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      setMsg(action === 'block' ? `⊘ Blocked — image permanently removed from all cards` : `✓ Reinstated — suspension lifted, image visible again`);
      loadReports();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setActing(null);
    }
  }

  // ── Screens ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#07020e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a90', fontSize: 11, letterSpacing: '0.15em' }}>
      Checking…
    </div>
  );

  if (!custody) return (
    <div style={{ minHeight: '100dvh', background: '#07020e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ fontSize: 20 }}>🔒</p>
      <p style={{ fontSize: 11, color: '#a08cc0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Open in Farcaster</p>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: '100dvh', background: '#07020e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ fontSize: 24 }}>🚫</p>
      <p style={{ fontSize: 11, color: '#e63946', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Not authorised</p>
    </div>
  );

  const visible = filter === 'pending'
    ? reports.filter(r => !r.resolved)
    : reports;

  const pendingCount = reports.filter(r => !r.resolved).length;

  return (
    <div style={{ minHeight: '100dvh', background: '#07020e', padding: '24px 16px 60px', maxWidth: 600, margin: '0 auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.35em', color: '#6b5a80', textTransform: 'uppercase', margin: 0 }}>
            THE PROTOCOL · ADMIN
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/admin/editions" style={{ fontSize: 9, color: '#a08cc0', letterSpacing: '0.15em', textDecoration: 'none', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(138,99,210,0.2)' }}>
              Editions
            </a>
            <a href="/" style={{ fontSize: 9, color: '#a08cc0', letterSpacing: '0.15em', textDecoration: 'none', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(138,99,210,0.2)' }}>
              ← Home
            </a>
          </div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.08em', color: '#e0d4f0', margin: 0 }}>
          PFP REPORTS
        </h1>
        <p style={{ fontSize: 9, color: '#7a6a90', marginTop: 4 }}>
          {pendingCount} pending · {reports.length} total
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 14px', borderRadius: 99, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
              border: filter === f ? '1px solid #8a63d2' : '1px solid rgba(138,99,210,0.2)',
              background: filter === f ? 'rgba(138,99,210,0.15)' : 'transparent',
              color: filter === f ? '#c4a4ff' : '#a08cc0',
            }}
          >
            {f === 'pending' ? `Pending (${pendingCount})` : `All (${reports.length})`}
          </button>
        ))}
      </div>

      {/* Status message */}
      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 10,
          background: msg.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(230,57,70,0.08)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(230,57,70,0.3)'}`,
          fontSize: 11, color: msg.startsWith('✓') ? '#22c55e' : '#e63946',
        }}>
          {msg}
        </div>
      )}

      {/* Reports list */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b5a80', fontSize: 11, letterSpacing: '0.15em' }}>
          {filter === 'pending' ? 'No pending reports' : 'No reports yet'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map(report => (
            <div
              key={report.id}
              style={{
                borderRadius: 14, padding: '14px',
                background: report.resolved ? 'rgba(138,99,210,0.03)' : 'rgba(138,99,210,0.06)',
                border: report.resolved
                  ? '1px solid rgba(138,99,210,0.1)'
                  : '1px solid rgba(230,57,70,0.2)',
                opacity: report.resolved ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

                {/* Image preview */}
                <div style={{
                  width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                  border: '1px solid rgba(138,99,210,0.2)', background: '#0a0415',
                }}>
                  <Image
                    src={report.image_url}
                    alt={`FID ${report.fid} pfp`}
                    width={60} height={60}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    unoptimized
                  />
                </div>

                {/* Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#8a63d2', padding: '2px 7px', borderRadius: 99, background: 'rgba(138,99,210,0.1)', border: '1px solid rgba(138,99,210,0.3)' }}>
                      FID #{report.fid}
                    </span>
                    {!report.resolved && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', padding: '2px 7px', borderRadius: 99, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
                        ⚑ Suspended
                      </span>
                    )}
                    {report.reason && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#e86a6a', padding: '2px 7px', borderRadius: 99, background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.3)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.reason}
                      </span>
                    )}
                    {report.resolved && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: report.resolution === 'block' ? '#e86a6a' : '#6b5a80', padding: '2px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(138,99,210,0.15)' }}>
                        {report.resolution === 'block' ? '⊘ Blocked' : '✓ Reinstated'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 8, color: '#6b5a80', marginBottom: 6, wordBreak: 'break-all' }}>
                    {report.image_url.length > 60 ? report.image_url.slice(0, 60) + '…' : report.image_url}
                  </div>

                  <div style={{ fontSize: 8, color: '#504060' }}>
                    {new Date(report.reported_at).toLocaleString()}
                    {report.reporter_fid && ` · by FID #${report.reporter_fid}`}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!report.resolved && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => resolve(report.id, 'block')}
                    disabled={acting === report.id}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 10, fontWeight: 900,
                      letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                      border: '1px solid rgba(230,57,70,0.4)',
                      background: 'rgba(230,57,70,0.1)', color: '#e86a6a',
                      opacity: acting === report.id ? 0.5 : 1,
                    }}
                  >
                    {acting === report.id ? 'Working…' : '⊘ Block Image'}
                  </button>
                  <button
                    onClick={() => resolve(report.id, 'dismiss')}
                    disabled={acting === report.id}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 10, fontWeight: 900,
                      letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                      border: '1px solid rgba(34,197,94,0.25)',
                      background: 'rgba(34,197,94,0.06)', color: '#22c55e',
                      opacity: acting === report.id ? 0.5 : 1,
                    }}
                  >
                    {acting === report.id ? 'Working…' : '✓ Reinstate'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
