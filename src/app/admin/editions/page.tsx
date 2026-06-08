'use client';

import { useState, useEffect } from 'react';
import type { DbEditionRow } from '@/lib/editionDb';
import { isAdminAddress } from '@/lib/adminAuth';

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(138,99,210,0.2)',
  background: 'rgba(138,99,210,0.05)',
  color: '#e0d4f0', fontSize: 11, outline: 'none',
};
const LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
  color: '#a08cc0', textTransform: 'uppercase', display: 'block', marginBottom: 4,
};

const RARITY_TIERS  = ['Alpha', 'Legendary', 'Elite', 'Rare', 'Common'] as const;
const CARD_TYPES    = ['CAPTAIN', 'BROADCASTER', 'PUBLISHER', 'AGITATOR', 'NETWORKER'] as const;
const PACK_KEYS     = ['scroll', 'tablet', 'codex'] as const;
const DEFAULT_MULTS = { Alpha: 1.50, Legendary: 1.30, Elite: 1.15, Rare: 1.05, Common: 1.00 };
const DEFAULT_LOGS  = { BROADCASTER: 3.699, PUBLISHER: 3.301, AGITATOR: 3.001, NETWORKER: 2.301 };

interface FormState {
  id: string; name: string; is_default: boolean; sort_order: number;
  header_era: string; bg_image: string; accent_primary: string; accent_secondary: string;
  description: string; tag_label: string; tag_color: string;
  embed_image_url: string; splash_image_url: string;
  season_label: string; rules: string;
  rarity_names: Record<string, string>;
  slot_labels:  Record<string, string>;
  slot_descs:   Record<string, string>;
  pack_names:   Record<string, { name: string; subtitle: string; flavour: string }>;
  captain_mults: Record<string, number>;
  log_maxes:     Record<string, number>;
}

function blankForm(): FormState {
  return {
    id: '', name: '', is_default: false, sort_order: 99,
    header_era: '', bg_image: '', accent_primary: '#8a63d2', accent_secondary: '#3a9bdc',
    description: '', tag_label: 'NEW', tag_color: '#8a63d2',
    embed_image_url: '', splash_image_url: '',
    season_label: '', rules: '',
    rarity_names: { Alpha: 'GENESIS', Legendary: 'ORACLE', Elite: 'NODE', Rare: 'VALIDATOR', Common: 'USER' },
    slot_labels:  { CAPTAIN: 'Captain', BROADCASTER: 'Broadcaster', PUBLISHER: 'Publisher', AGITATOR: 'Agitator', NETWORKER: 'Networker' },
    slot_descs:   { CAPTAIN: 'Any card · rarity multiplies team score', BROADCASTER: '', PUBLISHER: '', AGITATOR: '', NETWORKER: '' },
    pack_names:   { scroll: { name: 'SCROLL', subtitle: 'Common to Elite', flavour: '3 cards — common weighted' }, tablet: { name: 'TABLET', subtitle: 'Rare & above', flavour: '5 cards — no common' }, codex: { name: 'CODEX', subtitle: 'Legendary & above', flavour: '10 cards — rare minimum' } },
    captain_mults: { ...DEFAULT_MULTS },
    log_maxes:     { ...DEFAULT_LOGS },
  };
}

export default function AdminEditionsPage() {
  const [custody, setCustody]       = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [editions, setEditions]     = useState<DbEditionRow[]>([]);
  const [form, setForm]             = useState<FormState>(blankForm());
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');
  const [section, setSection]       = useState<'basic' | 'theme' | 'rarity' | 'slots' | 'packs' | 'scoring'>('basic');

  // Auth check — tries wallet address first (no API call), then FID via Neynar
  useEffect(() => {
    async function check() {
      // 1. Direct wallet address check (browser wallet connected)
      let walletAddr: string | null = null;
      try { walletAddr = sessionStorage.getItem('wallet_address'); } catch { /* noop */ }
      if (walletAddr && isAdminAddress(walletAddr)) {
        setCustody(walletAddr);
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // 2. FID-based check (Farcaster miniapp or wallet-resolved FID)
      let fid: string | null = null;
      try { fid = sessionStorage.getItem('miniapp_fid'); } catch { /* noop */ }
      if (!fid) { setLoading(false); return; }

      try {
        const res  = await fetch(`/api/admin/check?fid=${fid}`);
        const data = await res.json() as { authorized: boolean; custody: string | null };
        setCustody(data.custody ?? null);
        setAuthorized(data.authorized);
      } catch {
        // network error — remain unauthorized
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  // Load editions when authorized
  useEffect(() => {
    if (!authorized) return;
    fetch('/api/editions')
      .then(r => r.json())
      .then(d => setEditions(d.editions ?? []));
  }, [authorized]);

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true); setMsg('');
    try {
      const body = { ...form, embed_image_url: form.embed_image_url || null, splash_image_url: form.splash_image_url || null };
      const res = await fetch('/api/editions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': custody ?? '' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      setMsg('✓ Edition created');
      setForm(blankForm());
      fetch('/api/editions').then(r => r.json()).then(d => setEditions(d.editions ?? []));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/editions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-wallet-address': custody ?? '' },
      body: JSON.stringify(body),
    });
    fetch('/api/editions').then(r => r.json()).then(d => setEditions(d.editions ?? []));
  }

  // ── Screens ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#07020e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a90', fontSize: 11, letterSpacing: '0.15em' }}>
      Checking…
    </div>
  );

  if (!custody) return (
    <div style={{ minHeight: '100dvh', background: '#07020e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ fontSize: 20 }}>🔒</p>
      <p style={{ fontSize: 11, color: '#a08cc0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Open in Farcaster</p>
      <p style={{ fontSize: 9, color: '#7a6a90' }}>Admin is only accessible inside the Farcaster miniapp</p>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: '100dvh', background: '#07020e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ fontSize: 24 }}>🚫</p>
      <p style={{ fontSize: 11, color: '#e63946', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Not authorised</p>
      <p style={{ fontSize: 9, color: '#7a6a90' }}>{custody}</p>
    </div>
  );

  const SECTIONS = [
    { key: 'basic', label: 'Basic' }, { key: 'theme', label: 'Theme' },
    { key: 'rarity', label: 'Rarity' }, { key: 'slots', label: 'Slots' },
    { key: 'packs', label: 'Packs' }, { key: 'scoring', label: 'Scoring' },
  ] as const;

  return (
    <div style={{ minHeight: '100dvh', background: '#07020e', padding: '24px 16px 60px', maxWidth: 600, margin: '0 auto', boxSizing: 'border-box' }}>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.35em', color: '#6b5a80', textTransform: 'uppercase', margin: '0 0 6px' }}>THE PROTOCOL · ADMIN</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.08em', color: '#e0d4f0', margin: 0 }}>EDITION MANAGER</h1>
        <p style={{ fontSize: 9, color: '#7a6a90', marginTop: 4 }}>{custody}</p>
      </div>

      {/* Existing editions */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 10 }}>Active Editions</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {editions.map(ed => (
            <div key={ed.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(138,99,210,0.05)', border: `1px solid ${ed.is_default ? ed.accent_primary : 'rgba(138,99,210,0.15)'}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ed.is_default ? ed.accent_primary : '#e0d4f0' }}>
                  {ed.name}{ed.is_default && <span style={{ fontSize: 8, marginLeft: 6, letterSpacing: '0.15em' }}>DEFAULT</span>}
                </div>
                <div style={{ fontSize: 9, color: '#a08cc0', marginTop: 2 }}>/{ed.id} · {ed.is_active ? 'active' : 'hidden'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!ed.is_default && (
                  <button onClick={() => patch(ed.id, { is_default: true })} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${ed.accent_primary}40`, background: 'transparent', color: ed.accent_primary, fontSize: 8, fontWeight: 700, cursor: 'pointer' }}>
                    SET DEFAULT
                  </button>
                )}
                <button onClick={() => patch(ed.id, { is_active: !ed.is_active })} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(138,99,210,0.2)', background: 'transparent', color: '#a08cc0', fontSize: 8, fontWeight: 700, cursor: 'pointer' }}>
                  {ed.is_active ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
          ))}
          {editions.length === 0 && <p style={{ fontSize: 10, color: '#7a6a90' }}>No editions yet — hit /api/migrate first.</p>}
        </div>
      </div>

      {/* Create form */}
      <div style={{ borderTop: '1px solid rgba(138,99,210,0.15)', paddingTop: 24 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: '#a08cc0', textTransform: 'uppercase', marginBottom: 16 }}>Create New Edition</p>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', border: section === s.key ? '1px solid #8a63d2' : '1px solid rgba(138,99,210,0.2)', background: section === s.key ? 'rgba(138,99,210,0.15)' : 'transparent', color: section === s.key ? '#c4a4ff' : '#a08cc0', cursor: 'pointer' }}>
              {s.label.toUpperCase()}
            </button>
          ))}
        </div>

        {section === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={LABEL}>Edition ID (slug)</label><input style={FIELD_STYLE} value={form.id} onChange={e => setF('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="my-edition" /></div>
            <div><label style={LABEL}>Display Name</label><input style={FIELD_STYLE} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="My Edition" /></div>
            <div><label style={LABEL}>Description</label><textarea style={{ ...FIELD_STYLE, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setF('description', e.target.value)} /></div>
            <div><label style={LABEL}>Tag Label</label><input style={FIELD_STYLE} value={form.tag_label} onChange={e => setF('tag_label', e.target.value)} placeholder="NEW SEASON" /></div>
            <div>
              <label style={LABEL}>Tag Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.tag_color} onChange={e => setF('tag_color', e.target.value)} style={{ width: 40, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer' }} />
                <input style={{ ...FIELD_STYLE, flex: 1 }} value={form.tag_color} onChange={e => setF('tag_color', e.target.value)} />
              </div>
            </div>
            <div><label style={LABEL}>Season Label</label><input style={FIELD_STYLE} value={form.season_label} onChange={e => setF('season_label', e.target.value)} placeholder="Season 1" /></div>
            <div><label style={LABEL}>Rules</label><textarea style={{ ...FIELD_STYLE, minHeight: 72, resize: 'vertical' }} value={form.rules} onChange={e => setF('rules', e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" id="isDef" checked={form.is_default} onChange={e => setF('is_default', e.target.checked)} />
              <label htmlFor="isDef" style={{ ...LABEL, margin: 0, cursor: 'pointer' }}>Set as default (controls embed + launch)</label>
            </div>
            <div><label style={LABEL}>Sort Order</label><input type="number" style={FIELD_STYLE} value={form.sort_order} onChange={e => setF('sort_order', Number(e.target.value))} /></div>
          </div>
        )}

        {section === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={LABEL}>Header Era Text</label><input style={FIELD_STYLE} value={form.header_era} onChange={e => setF('header_era', e.target.value)} placeholder="FARCASTER · SEASON 1" /></div>
            <div><label style={LABEL}>Background Image URL</label><input style={FIELD_STYLE} value={form.bg_image} onChange={e => setF('bg_image', e.target.value)} placeholder="/editions/my-bg.jpg" /></div>
            <div>
              <label style={LABEL}>Primary Accent</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.accent_primary} onChange={e => setF('accent_primary', e.target.value)} style={{ width: 40, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer' }} />
                <input style={{ ...FIELD_STYLE, flex: 1 }} value={form.accent_primary} onChange={e => setF('accent_primary', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Secondary Accent</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.accent_secondary} onChange={e => setF('accent_secondary', e.target.value)} style={{ width: 40, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer' }} />
                <input style={{ ...FIELD_STYLE, flex: 1 }} value={form.accent_secondary} onChange={e => setF('accent_secondary', e.target.value)} />
              </div>
            </div>
            <div><label style={LABEL}>Embed/OG Image URL (optional)</label><input style={FIELD_STYLE} value={form.embed_image_url} onChange={e => setF('embed_image_url', e.target.value)} placeholder="https://…" /></div>
            <div><label style={LABEL}>Splash Image URL (optional)</label><input style={FIELD_STYLE} value={form.splash_image_url} onChange={e => setF('splash_image_url', e.target.value)} placeholder="https://…" /></div>
          </div>
        )}

        {section === 'rarity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 9, color: '#a08cc0' }}>Rename the five rarity tiers for this edition.</p>
            {RARITY_TIERS.map(tier => (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, color: '#a08cc0', width: 70, flexShrink: 0 }}>{tier}</span>
                <input style={{ ...FIELD_STYLE, flex: 1 }} value={form.rarity_names[tier] ?? ''} onChange={e => setF('rarity_names', { ...form.rarity_names, [tier]: e.target.value })} />
              </div>
            ))}
          </div>
        )}

        {section === 'slots' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CARD_TYPES.map(t => (
              <div key={t}>
                <p style={{ ...LABEL, marginBottom: 6 }}>{t}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...FIELD_STYLE, flex: 1 }} value={form.slot_labels[t] ?? ''} onChange={e => setF('slot_labels', { ...form.slot_labels, [t]: e.target.value })} placeholder="Display name" />
                  <input style={{ ...FIELD_STYLE, flex: 2 }} value={form.slot_descs[t] ?? ''} onChange={e => setF('slot_descs', { ...form.slot_descs, [t]: e.target.value })} placeholder="Description" />
                </div>
              </div>
            ))}
          </div>
        )}

        {section === 'packs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PACK_KEYS.map(pk => (
              <div key={pk}>
                <p style={{ ...LABEL, marginBottom: 6 }}>{pk.toUpperCase()}</p>
                {(['name', 'subtitle', 'flavour'] as const).map(f => (
                  <input key={f} style={{ ...FIELD_STYLE, marginBottom: 6 }} value={(form.pack_names[pk] as Record<string, string>)[f] ?? ''} onChange={e => setF('pack_names', { ...form.pack_names, [pk]: { ...form.pack_names[pk], [f]: e.target.value } })} placeholder={f} />
                ))}
              </div>
            ))}
          </div>
        )}

        {section === 'scoring' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ ...LABEL, marginBottom: 8 }}>Captain Multipliers</p>
              {RARITY_TIERS.map(tier => (
                <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: '#a08cc0', width: 80, flexShrink: 0 }}>{tier}</span>
                  <input type="number" step="0.01" min="1" max="3" style={{ ...FIELD_STYLE, flex: 1 }} value={form.captain_mults[tier] ?? DEFAULT_MULTS[tier as keyof typeof DEFAULT_MULTS]} onChange={e => setF('captain_mults', { ...form.captain_mults, [tier]: parseFloat(e.target.value) })} />
                </div>
              ))}
            </div>
            <div>
              <p style={{ ...LABEL, marginBottom: 4 }}>Log₁₀ Max Caps</p>
              <p style={{ fontSize: 9, color: '#7a6a90', marginBottom: 8 }}>log10(5001) ≈ 3.699 — the weekly count that earns 100 pts</p>
              {(['BROADCASTER', 'PUBLISHER', 'AGITATOR', 'NETWORKER'] as const).map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: '#a08cc0', width: 100, flexShrink: 0 }}>{t}</span>
                  <input type="number" step="0.001" min="1" max="6" style={{ ...FIELD_STYLE, flex: 1 }} value={form.log_maxes[t] ?? DEFAULT_LOGS[t]} onChange={e => setF('log_maxes', { ...form.log_maxes, [t]: parseFloat(e.target.value) })} />
                </div>
              ))}
            </div>
          </div>
        )}

        {msg && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: msg.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(230,57,70,0.08)', border: `1px solid ${msg.startsWith('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(230,57,70,0.3)'}`, fontSize: 11, color: msg.startsWith('✓') ? '#22c55e' : '#e63946' }}>
            {msg}
          </div>
        )}

        <button onClick={save} disabled={saving || !form.id || !form.name} style={{ marginTop: 20, width: '100%', padding: '14px', borderRadius: 12, background: (!form.id || !form.name) ? 'rgba(138,99,210,0.08)' : 'linear-gradient(135deg, #8a63d2, #C9A84C)', border: 'none', color: (!form.id || !form.name) ? '#7a6a90' : '#fff', fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: (!form.id || !form.name) ? 'default' : 'pointer' }}>
          {saving ? 'Creating…' : 'Create Edition'}
        </button>
      </div>
    </div>
  );
}
