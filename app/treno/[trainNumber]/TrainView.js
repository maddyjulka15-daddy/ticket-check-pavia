'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { alertLevel } from '@/lib/level';
import { getBuyLinks } from '@/lib/buyLinks';
import { STATIONS } from '@/lib/stations';

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function findSlug(name) {
  if (!name) return null;
  const norm = name.toLowerCase().replace(/[.\s_]/g, '');
  for (const [slug, st] of Object.entries(STATIONS)) {
    if (st.name.toLowerCase().replace(/[.\s_]/g, '') === norm) return slug;
  }
  return null;
}

function getDeviceId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

const COOLDOWN_MS = 15 * 60 * 1000;
const UNDO_WINDOW_MS = 2 * 60 * 1000; // 2 minutes to undo

export default function TrainView({ trainNumber }) {
  const [count, setCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [stops, setStops] = useState([]);
  const [info, setInfo] = useState(null);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [lastReportId, setLastReportId] = useState(null);
  const [lastReportTime, setLastReportTime] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());

  const loadCount = useCallback(async () => {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: c } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('train_number', trainNumber)
      .gte('created_at', since);
    setCount(c || 0);
  }, [trainNumber]);

  const loadStops = useCallback(async () => {
    try {
      const res = await fetch(`/api/train-stops?trainNumber=${trainNumber}`, { cache: 'no-store' });
      const data = await res.json();
      setStops(data.stops || []);
      setInfo(data.info || null);
    } catch {
      setStops([]);
    } finally {
      setStopsLoading(false);
    }
  }, [trainNumber]);

  useEffect(() => {
    loadCount();
    loadStops();
    // restore last report info from localStorage if still within undo window
    const storedId = localStorage.getItem(`last_report_id_${trainNumber}`);
    const storedTime = parseInt(localStorage.getItem(`last_report_${trainNumber}`) || '0', 10);
    if (storedId && Date.now() - storedTime < UNDO_WINDOW_MS) {
      setLastReportId(storedId);
      setLastReportTime(storedTime);
    }
    const channel = supabase
      .channel(`train-${trainNumber}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', filter: `train_number=eq.${trainNumber}` }, () => loadCount())
      .subscribe();
    const t = setInterval(loadStops, 120000);
    const tick = setInterval(() => setNowTs(Date.now()), 1000);
    return () => { supabase.removeChannel(channel); clearInterval(t); clearInterval(tick); };
  }, [trainNumber, loadCount, loadStops]);

  async function submit() {
    setSubmitting(true);
    setMessage(null);
    const deviceId = getDeviceId();
    const key = `last_report_${trainNumber}`;
    const last = parseInt(localStorage.getItem(key) || '0', 10);
    if (Date.now() - last < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60000);
      setMessage(`You already reported. Try again in ${mins} min.`);
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase
      .from('reports')
      .insert({ train_number: trainNumber, device_id: deviceId })
      .select()
      .single();
    if (error) {
      setMessage('Error. Try again.');
    } else {
      const now = Date.now();
      localStorage.setItem(key, String(now));
      localStorage.setItem(`last_report_id_${trainNumber}`, data.id);
      setLastReportId(data.id);
      setLastReportTime(now);
      setMessage('Report sent. Thank you!');
      loadCount();
    }
    setSubmitting(false);
  }

  async function undo() {
    if (!lastReportId) return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', lastReportId);
    if (error) {
      setMessage('Could not undo. Try again.');
    } else {
      localStorage.removeItem(`last_report_${trainNumber}`);
      localStorage.removeItem(`last_report_id_${trainNumber}`);
      setLastReportId(null);
      setLastReportTime(0);
      setMessage('Report cancelled.');
      loadCount();
    }
    setSubmitting(false);
  }

  const lvl = alertLevel(count);
  const undoSecondsLeft = lastReportId
    ? Math.max(0, Math.ceil((UNDO_WINDOW_MS - (nowTs - lastReportTime)) / 1000))
    : 0;
  const canUndo = undoSecondsLeft > 0;

  return (
    <main>
      <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>← Home</Link>
      <h1 style={{ fontSize: 32, margin: '12px 0 4px' }}>Train {trainNumber}</h1>
      {info && (
        <p style={{ color: '#aaa', margin: '0 0 4px', fontSize: 14 }}>
          {info.origin} → {info.destination}
          {info.category && <span style={{
            marginLeft: 8, padding: '2px 6px', background: '#2a2a2a',
            borderRadius: 4, fontSize: 11, color: '#aaa',
          }}>{info.category}</span>}
        </p>
      )}
      {info && info.delay !== 0 && (
        <p style={{ color: info.delay > 0 ? '#fb923c' : '#4ade80', margin: '4px 0', fontSize: 13 }}>
          {info.delay > 0 ? `Delayed by ${info.delay}′` : `${-info.delay}′ early`}
          {info.lastLocation && <span style={{ color: '#888' }}> · Last seen: {info.lastLocation}</span>}
        </p>
      )}

      {info && info.origin && info.destination && (() => {
        const fromSlug = findSlug(info.origin);
        const toSlug = findSlug(info.destination);
        const fromName = fromSlug ? STATIONS[fromSlug].name : titleCase(info.origin);
        const toName = toSlug ? STATIONS[toSlug].name : titleCase(info.destination);
        return (
          <div style={{ margin: '12px 0 8px' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
              🎫 Buy a ticket
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {getBuyLinks(fromSlug, toSlug, fromName, toName).map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 10px', fontSize: 12, fontWeight: 600,
                    background: '#1a1a1a', borderRadius: 6, textDecoration: 'none',
                    color: '#7dd3fc', border: '1px solid #2a2a2a',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      <p style={{ color: '#aaa', margin: '12px 0 20px', fontSize: 14 }}>Report if you see an inspector on board.</p>

      <div style={{
        padding: 20, background: '#1a1a1a', borderRadius: 12, marginBottom: 20, textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: '#888' }}>Alert level (last hour)</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: lvl.color, marginTop: 4 }}>
          {lvl.emoji} {lvl.label}
        </div>
        <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
          {count} report{count === 1 ? '' : 's'}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={submitting || canUndo}
        style={{
          width: '100%', padding: '20px', fontSize: 18, fontWeight: 700,
          background: canUndo ? '#444' : '#dc2626', color: '#fff', border: 'none', borderRadius: 12,
          cursor: (submitting || canUndo) ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        🚨 Inspector on board
      </button>

      {canUndo && (
        <button
          onClick={undo}
          disabled={submitting}
          style={{
            width: '100%', marginTop: 10, padding: '14px', fontSize: 15, fontWeight: 600,
            background: 'transparent', color: '#fbbf24', border: '2px solid #fbbf24',
            borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          👀 Undo report ({undoSecondsLeft}s)
        </button>
      )}

      {message && (
        <p style={{ marginTop: 16, padding: 12, background: '#1a1a1a', borderRadius: 8, color: '#aaa', textAlign: 'center' }}>
          {message}
        </p>
      )}

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Stops</h2>
      {stopsLoading && <div style={{ color: '#888', padding: 12 }}>Loading stops…</div>}
      {!stopsLoading && stops.length === 0 && (
        <div style={{ color: '#888', padding: 12, fontSize: 13 }}>
          Stops not available for this train.
        </div>
      )}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {stops.map((s, i) => {
          const time = s.actualDeparture || s.scheduledDeparture || s.actualArrival || s.scheduledArrival || '';
          const delayed = s.actualDeparture && s.scheduledDeparture && s.actualDeparture !== s.scheduledDeparture;
          return (
            <li key={i} style={{
              padding: '12px 14px', background: '#1a1a1a', borderRadius: 8,
              marginBottom: 6, border: '1px solid #2a2a2a',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                {s.platform && <div style={{ color: '#666', fontSize: 11 }}>Plat. {s.platform}</div>}
              </div>
              <div style={{ fontSize: 14, color: delayed ? '#fb923c' : '#aaa', fontWeight: 500 }}>
                {time}
                {delayed && s.scheduledDeparture && <span style={{ color: '#666', textDecoration: 'line-through', marginLeft: 6, fontSize: 11 }}>{s.scheduledDeparture}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
