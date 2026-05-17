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
const UNDO_WINDOW_MS = 2 * 60 * 1000;

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
      setMessage('Report sent. Thank you.');
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
      <Link href="/" style={{
        color: '#0a84ff', textDecoration: 'none', fontSize: 15, fontWeight: 500,
      }}>‹ Home</Link>
      <h1 style={{
        fontSize: 34, fontWeight: 700, margin: '16px 0 4px',
        letterSpacing: '-0.03em',
      }}>Train {trainNumber}</h1>
      {info && (
        <p style={{ color: 'rgba(235, 235, 245, 0.7)', margin: '0 0 6px', fontSize: 15 }}>
          {info.origin} → {info.destination}
          {info.category && <span style={{
            marginLeft: 10, fontSize: 11, fontWeight: 600,
            color: 'rgba(235, 235, 245, 0.6)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{info.category}</span>}
        </p>
      )}
      {info && info.delay !== 0 && (
        <p style={{
          color: info.delay > 0 ? '#ff9f0a' : '#30d158',
          margin: '4px 0', fontSize: 13, fontWeight: 500,
        }}>
          {info.delay > 0 ? `Delayed by ${info.delay}′` : `${-info.delay}′ early`}
          {info.lastLocation && <span style={{ color: 'rgba(235, 235, 245, 0.5)', fontWeight: 400 }}> · Last seen: {info.lastLocation}</span>}
        </p>
      )}

      {info && info.origin && info.destination && (() => {
        const fromSlug = findSlug(info.origin);
        const toSlug = findSlug(info.destination);
        const fromName = fromSlug ? STATIONS[fromSlug].name : titleCase(info.origin);
        const toName = toSlug ? STATIONS[toSlug].name : titleCase(info.destination);
        return (
          <div style={{ margin: '16px 0 8px' }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'rgba(235, 235, 245, 0.6)', marginBottom: 8,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Buy a ticket
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {getBuyLinks(fromSlug, toSlug, fromName, toName).map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    background: '#1c1c1e', borderRadius: 10, textDecoration: 'none',
                    color: '#0a84ff',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      <p style={{
        color: 'rgba(235, 235, 245, 0.6)',
        margin: '20px 0 16px', fontSize: 14, lineHeight: 1.4,
      }}>Report if you see an inspector on board.</p>

      <div style={{
        padding: 22, background: '#1c1c1e', borderRadius: 16,
        marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(235, 235, 245, 0.6)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Alert level · last hour</div>
        <div style={{
          fontSize: 32, fontWeight: 700, color: lvl.color,
          marginTop: 6, letterSpacing: '-0.02em',
        }}>
          {lvl.label}
        </div>
        <div style={{ color: 'rgba(235, 235, 245, 0.5)', fontSize: 13, marginTop: 4 }}>
          {count} report{count === 1 ? '' : 's'}
        </div>
      </div>

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
      }}>Stops</h2>
      {stopsLoading && <div style={{ color: 'rgba(235, 235, 245, 0.4)', padding: 12 }}>Loading stops…</div>}
      {!stopsLoading && stops.length === 0 && (
        <div style={{ color: 'rgba(235, 235, 245, 0.5)', padding: 12, fontSize: 13 }}>
          Stops not available for this train.
        </div>
      )}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, background: '#1c1c1e', borderRadius: 14, overflow: 'hidden' }}>
        {stops.map((s, i) => {
          const time = s.actualDeparture || s.scheduledDeparture || s.actualArrival || s.scheduledArrival || '';
          const delayed = s.actualDeparture && s.scheduledDeparture && s.actualDeparture !== s.scheduledDeparture;
          return (
            <li key={i} style={{
              padding: '14px 16px',
              borderBottom: i < stops.length - 1 ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{s.name}</div>
                {s.platform && <div style={{ color: 'rgba(235, 235, 245, 0.4)', fontSize: 11, marginTop: 2 }}>Platform {s.platform}</div>}
              </div>
              <div style={{ fontSize: 15, color: delayed ? '#ff9f0a' : 'rgba(235, 235, 245, 0.7)', fontWeight: 500 }}>
                {time}
                {delayed && s.scheduledDeparture && <span style={{ color: 'rgba(235, 235, 245, 0.3)', textDecoration: 'line-through', marginLeft: 6, fontSize: 11 }}>{s.scheduledDeparture}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
