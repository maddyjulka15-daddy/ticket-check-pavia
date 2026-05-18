'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const BusMap = dynamic(() => import('./BusMap'), { ssr: false, loading: () => (
  <div style={{
    marginTop: 12, height: 260, background: '#1c1c1e',
    borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'rgba(235, 235, 245, 0.4)', fontSize: 13,
  }}>Loading map…</div>
)});

function getDeviceId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

const COOLDOWN_MS = 30 * 60 * 1000;
const UNDO_WINDOW_MS = 2 * 60 * 1000;
const ALERT_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_KEY = 'bus_last_global';

function freshnessTint(ageMin) {
  if (ageMin < 15) return { color: '#ff453a', label: 'Just now' };
  if (ageMin < 45) return { color: '#ff9f0a', label: 'Likely still active' };
  if (ageMin < 90) return { color: '#ffd60a', label: 'Older — may have left' };
  return { color: 'rgba(235, 235, 245, 0.4)', label: 'Stale' };
}

export default function BusLineView({ line }) {
  const [reports, setReports] = useState([]);
  const [direction, setDirection] = useState('either');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastReportId, setLastReportId] = useState(null);
  const [lastReportTime, setLastReportTime] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());

  const loadReports = useCallback(async () => {
    const since = new Date(Date.now() - ALERT_WINDOW_MS).toISOString();
    const { data } = await supabase
      .from('bus_reports')
      .select('id, direction, stop, created_at')
      .eq('line_number', line.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    setReports(data || []);
  }, [line.id]);

  useEffect(() => {
    loadReports();
    const storedId = localStorage.getItem(`bus_last_id_${line.id}`);
    const storedTime = parseInt(localStorage.getItem(`bus_last_${line.id}`) || '0', 10);
    if (storedId && Date.now() - storedTime < UNDO_WINDOW_MS) {
      setLastReportId(storedId);
      setLastReportTime(storedTime);
    }
    const channel = supabase
      .channel(`bus-${line.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_reports', filter: `line_number=eq.${line.id}` }, () => loadReports())
      .subscribe();
    const tick = setInterval(() => setNowTs(Date.now()), 1000);
    return () => { supabase.removeChannel(channel); clearInterval(tick); };
  }, [line.id, loadReports]);

  async function submit() {
    setSubmitting(true);
    setMessage(null);
    const deviceId = getDeviceId();
    const lastGlobal = parseInt(localStorage.getItem(GLOBAL_KEY) || '0', 10);
    if (Date.now() - lastGlobal < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (Date.now() - lastGlobal)) / 60000);
      setMessage(`You already reported recently. Wait ${mins} min — you can only be on one bus at a time.`);
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase
      .from('bus_reports')
      .insert({
        line_number: line.id,
        direction: direction === 'either' ? null : direction,
        device_id: deviceId,
      })
      .select()
      .single();
    if (error) {
      setMessage('Error. Try again.');
    } else {
      const now = Date.now();
      localStorage.setItem(GLOBAL_KEY, String(now));
      localStorage.setItem(`bus_last_id_${line.id}`, data.id);
      setLastReportId(data.id);
      setLastReportTime(now);
      setMessage('Report sent. Thank you.');
      loadReports();
    }
    setSubmitting(false);
  }

  async function undo() {
    if (!lastReportId) return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase
      .from('bus_reports')
      .delete()
      .eq('id', lastReportId);
    if (error) {
      setMessage('Could not undo. Try again.');
    } else {
      localStorage.removeItem(GLOBAL_KEY);
      localStorage.removeItem(`bus_last_id_${line.id}`);
      setLastReportId(null);
      setLastReportTime(0);
      setMessage('Report cancelled.');
      loadReports();
    }
    setSubmitting(false);
  }

  const undoSecondsLeft = lastReportId
    ? Math.max(0, Math.ceil((UNDO_WINDOW_MS - (nowTs - lastReportTime)) / 1000))
    : 0;
  const canUndo = undoSecondsLeft > 0;

  const recentReports = reports;
  const highestFreshness = recentReports[0]
    ? freshnessTint((nowTs - new Date(recentReports[0].created_at).getTime()) / 60000)
    : null;

  return (
    <main>
      <Link href="/bus" style={{
        color: '#0a84ff', textDecoration: 'none', fontSize: 15, fontWeight: 500,
      }}>‹ Buses</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '16px 0 4px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: '#1c1c1e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em',
        }}>
          {line.id}
        </div>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 700, margin: 0,
            letterSpacing: '-0.025em',
          }}>Line {line.id}</h1>
          <p style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 14, margin: '4px 0 0' }}>
            {line.name}
          </p>
        </div>
      </div>

      <a
        href={line.scheduleUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block', marginTop: 12,
          padding: '8px 14px', fontSize: 13, fontWeight: 600,
          background: '#1c1c1e', borderRadius: 10, textDecoration: 'none',
          color: '#0a84ff',
        }}
      >
        Official timetable ↗
      </a>

      <BusMap lineId={line.id} />

      <div style={{
        padding: 22, background: '#1c1c1e', borderRadius: 16,
        marginTop: 20, marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(235, 235, 245, 0.6)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Alert level · last hour</div>
        <div style={{
          fontSize: 32, fontWeight: 700,
          color: highestFreshness ? highestFreshness.color : 'rgba(235, 235, 245, 0.5)',
          marginTop: 6, letterSpacing: '-0.02em',
        }}>
          {recentReports.length === 0 ? 'Clear' : highestFreshness.label}
        </div>
        <div style={{ color: 'rgba(235, 235, 245, 0.5)', fontSize: 13, marginTop: 4 }}>
          {recentReports.length} report{recentReports.length === 1 ? '' : 's'}
        </div>
      </div>

      {!line.circular && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'rgba(235, 235, 245, 0.6)', marginBottom: 8,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Direction (optional)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'either', label: 'Either way' },
              { key: `toward-${line.terminusA}`, label: `→ ${line.terminusA}` },
              { key: `toward-${line.terminusB}`, label: `→ ${line.terminusB}` },
            ].map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDirection(opt.key)}
                style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  background: direction === opt.key ? '#0a84ff' : '#1c1c1e',
                  color: direction === opt.key ? '#fff' : '#f5f5f7',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting || canUndo}
        style={{
          width: '100%', padding: '18px', fontSize: 17, fontWeight: 600,
          background: canUndo ? '#3a3a3c' : '#ff453a', color: '#fff',
          border: 'none', borderRadius: 14,
          cursor: (submitting || canUndo) ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
          letterSpacing: '-0.01em',
        }}
      >
        Inspector on board
      </button>

      {canUndo && (
        <button
          onClick={undo}
          disabled={submitting}
          style={{
            width: '100%', marginTop: 10, padding: '14px', fontSize: 15, fontWeight: 600,
            background: 'transparent', color: '#ff9f0a',
            border: '1.5px solid #ff9f0a',
            borderRadius: 14, cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          👀 Undo report · {undoSecondsLeft}s
        </button>
      )}

      {message && (
        <p style={{
          marginTop: 14, padding: 12, background: '#1c1c1e',
          borderRadius: 10, color: 'rgba(235, 235, 245, 0.7)',
          textAlign: 'center', fontSize: 14,
        }}>
          {message}
        </p>
      )}

      <h2 style={{
        fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12,
        letterSpacing: '-0.02em',
      }}>Recent reports</h2>
      {recentReports.length === 0 && (
        <div style={{ color: 'rgba(235, 235, 245, 0.5)', padding: 12, fontSize: 13 }}>
          No reports in the last hour.
        </div>
      )}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, background: '#1c1c1e', borderRadius: 14, overflow: 'hidden' }}>
        {recentReports.map((r, i) => {
          const ageMin = (nowTs - new Date(r.created_at).getTime()) / 60000;
          const tint = freshnessTint(ageMin);
          const ageLabel = ageMin < 1 ? 'just now' : `${Math.floor(ageMin)} min ago`;
          return (
            <li key={r.id} style={{
              padding: '14px 16px',
              borderBottom: i < recentReports.length - 1 ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: tint.color }}>
                  {ageLabel}
                </div>
                {r.direction && (
                  <div style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 12, marginTop: 2 }}>
                    {r.direction.replace('toward-', '→ ')}
                  </div>
                )}
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: tint.color,
              }} />
            </li>
          );
        })}
      </ol>
    </main>
  );
}
