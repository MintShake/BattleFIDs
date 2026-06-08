'use client';

import { useEffect, useState } from 'react';
import { CardType } from '@/types/card';
import { MAX_TEAM_SCORE } from '@/lib/weeklyScoring';
import { useEdition } from '@/editions/context';

interface SlotResult {
  type:   CardType;
  handle: string;
  thumb:  string;
  score:  number;
}

interface TeamData {
  totalScore: number;
  rank:       number | null;
  totalTeams: number;
  slots:      SlotResult[];
  wagerUsdc:  number;
  captainMult: number;
  weekId:     string;
  endsAt:     string;
}

function timeUntil(iso: string): string {
  const ms  = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const h   = Math.floor(ms / 3600000);
  const m   = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d left`;
  if (h >= 1)  return `${h}h ${m}m left`;
  return `${m}m left`;
}

interface Props {
  ownerFid?:   number;
  ownerDevice: string;
  onGoToTeam:  () => void;
}

export default function WeekProgress({ ownerFid, ownerDevice, onGoToTeam }: Props) {
  const edition = useEdition();
  const [data, setData]       = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const param = ownerFid ? `ownerFid=${ownerFid}` : `ownerDeviceId=${ownerDevice}`;
    fetch(`/api/week/team?${param}`)
      .then(r => r.json())
      .then(res => {
        if (!res.team) { setLoading(false); return; }
        const t = res.team;
        const scoreMap: Record<string, number> = res.scores ?? {};

        const slots: SlotResult[] = [
          { type: 'CAPTAIN',     handle: t.cap_handle ?? '—', thumb: t.cap_thumb ?? '', score: 0 },
          { type: 'BROADCASTER', handle: t.bc_handle  ?? '—', thumb: t.bc_thumb  ?? '', score: scoreMap[t.broadcaster_image_id] ?? 0 },
          { type: 'PUBLISHER',   handle: t.pc_handle  ?? '—', thumb: t.pc_thumb  ?? '', score: scoreMap[t.publisher_image_id]   ?? 0 },
          { type: 'AGITATOR',    handle: t.ag_handle  ?? '—', thumb: t.ag_thumb  ?? '', score: scoreMap[t.agitator_image_id]    ?? 0 },
          { type: 'NETWORKER',   handle: t.nc_handle  ?? '—', thumb: t.nc_thumb  ?? '', score: scoreMap[t.networker_image_id]   ?? 0 },
        ];

        setData({
          totalScore:  Number(t.total_score),
          rank:        t.rank ?? null,
          totalTeams:  0, // fetched separately
          slots,
          wagerUsdc:   Number(t.wager_usdc ?? 0),
          captainMult: 1, // computed server-side
          weekId:      res.weekId,
          endsAt:      '', // from weeks table, not yet fetched
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch leaderboard for total teams count
    fetch(`/api/week/leaderboard?limit=1`)
      .then(r => r.json())
      .then(res => setData(d => d ? { ...d, totalTeams: res.totalTeams ?? 0 } : d))
      .catch(() => {});
  }, [ownerFid, ownerDevice]);

  // Countdown ticker
  useEffect(() => {
    if (!data?.endsAt) return;
    const tick = () => setTimeLeft(timeUntil(data.endsAt));
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [data?.endsAt]);

  if (loading) return (
    <div style={{ textAlign: 'center', paddingTop: 40, color: '#3d3050', fontSize: 11, letterSpacing: '0.2em' }}>Loading…</div>
  );

  if (!data) return (
    <div style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚔</div>
      <p style={{ fontSize: 12, color: '#5c4070', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No team set</p>
      <p style={{ fontSize: 10, color: '#3d3050', marginTop: 6, marginBottom: 20 }}>Build your 5-card team to enter this week's competition</p>
      <button
        onClick={onGoToTeam}
        style={{
          padding: '12px 28px', borderRadius: 99,
          border: '1px solid rgba(138,99,210,0.4)',
          background: 'rgba(138,99,210,0.12)', color: '#8a63d2',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Build Team
      </button>
    </div>
  );

  const progressPct = Math.min(100, (data.totalScore / MAX_TEAM_SCORE) * 100);

  return (
    <div>
      {/* Header strip */}
      <div style={{
        borderRadius: 14, padding: '14px 16px', marginBottom: 12,
        background: 'linear-gradient(135deg, rgba(138,99,210,0.12), rgba(201,168,76,0.08))',
        border: '1px solid rgba(138,99,210,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', color: '#5c4070', textTransform: 'uppercase' }}>
            {data.weekId}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#C9A84C', lineHeight: 1.1 }}>{data.totalScore}</div>
          <div style={{ fontSize: 9, color: '#5c4070' }}>/ {MAX_TEAM_SCORE} max</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {data.rank && (
            <div style={{ fontSize: 22, fontWeight: 900, color: '#8a63d2' }}>
              #{data.rank}
              <span style={{ fontSize: 10, color: '#5c4070', fontWeight: 400 }}> / {data.totalTeams}</span>
            </div>
          )}
          {data.wagerUsdc > 0 && (
            <div style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700, marginTop: 4 }}>
              ${data.wagerUsdc} wager
            </div>
          )}
          {timeLeft && (
            <div style={{ fontSize: 9, color: '#3d3050', marginTop: 2 }}>{timeLeft}</div>
          )}
        </div>
      </div>

      {/* Score progress bar */}
      <div style={{ height: 4, background: 'rgba(138,99,210,0.12)', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #8a63d2, #C9A84C)', borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>

      {/* Per-slot breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.slots.map(slot => {
          const color = edition.cardSlots[slot.type].color;
          const pct   = slot.type === 'CAPTAIN' ? 100 : Math.min(100, slot.score);
          return (
            <div key={slot.type} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(138,99,210,0.04)',
              border: '1px solid rgba(138,99,210,0.1)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase', width: 72, flexShrink: 0 }}>
                {edition.league.cardTypeLabels[slot.type]}
              </div>
              <div style={{ fontSize: 9, color: '#5c4070', width: 80, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{slot.handle}
              </div>
              {slot.type === 'CAPTAIN' ? (
                <div style={{ flex: 1, fontSize: 9, color: '#C9A84C', fontWeight: 700, textAlign: 'right' }}>
                  multiplier
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, height: 4, background: 'rgba(138,99,210,0.12)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color, width: 28, textAlign: 'right', flexShrink: 0 }}>
                    {slot.score}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onGoToTeam}
        style={{
          marginTop: 16, width: '100%', padding: '11px', borderRadius: 10,
          border: '1px solid rgba(138,99,210,0.25)',
          background: 'transparent', color: '#8a63d2',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Edit Team
      </button>
    </div>
  );
}
