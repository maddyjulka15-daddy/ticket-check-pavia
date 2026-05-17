'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { alertLevel } from '@/lib/level';

export default function StationView({ slug, station }) {
  const [trains, setTrains] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadTrains = useCallback(async () => {
    try {
      const res = await fetch(`/api/departures/${station.code}`, { cache: 'no-store' });
      const data = await res.json();
      setTrains(data.trains || []);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [station.code]);

  const loadReports = useCallback(async () => {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('reports')
      .select('train_number')
      .gte('created_at', since);
    if (!data) return;
    const counts = {};
    for (const r of data) {
      counts[r.train_number] = (counts[r.train_number] || 0) + 1;
    }
    setReports(counts);
  }, []);

  useEffect(() => {
    loadTrains();
    loadReports();
    const t1 = setInterval(loadTrains, 60000);
    const t2 = setInterval(loadReports, 30000);
    const channel = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => loadReports())
      .subscribe();
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      supabase.removeChannel(channel);
    };
  }, [loadTrains, loadReports]);

  return (
    <main>
      <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>← Stations</Link>
      <h1 style={{ fontSize: 28, margin: '12px 0 4px' }}>{station.name}</h1>
      <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 4px' }}>
        Real-time departures
        {updatedAt && <> · updated {updatedAt.toLocaleTimeString('en-GB').slice(0,5)}</>}
      </p>
      <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px' }}>
        Live data from ViaggiaTreno
      </p>

      {loading && <div style={{ color: '#888', padding: 24, textAlign: 'center' }}>Loading…</div>}

      {!loading && trains.length === 0 && (
        <div style={{
          background: '#1a1a1a', padding: 24, borderRadius: 12, textAlign: 'center', color: '#888'
        }}>
          No upcoming trains. Try again later.
        </div>
      )}

      {error && (
        <div style={{ background: '#3a1a1a', color: '#fca5a5', padding: 12, borderRadius: 8, fontSize: 12 }}>
          Error: {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {trains.map((t) => {
          const count = reports[t.train_number] || 0;
          const lvl = alertLevel(count);
          const delay = t.delay_minutes;
          const isCancelled = !!t.cancelled;
          return (
            <Link
              key={t.train_number + t.departure_time}
              href={`/treno/${t.train_number}`}
              style={{
                display: 'block', padding: 14,
                background: isCancelled ? '#181010' : '#1a1a1a',
                borderRadius: 10,
                border: isCancelled ? '1px solid #5a2020' : '1px solid #2a2a2a',
                textDecoration: 'none',
                color: isCancelled ? '#888' : '#fff',
                opacity: isCancelled ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{
                    fontWeight: 700, fontSize: 18,
                    textDecoration: isCancelled ? 'line-through' : 'none',
                  }}>{t.train_number}</span>
                  {t.type && <span style={{
                    marginLeft: 8, padding: '2px 6px', background: '#2a2a2a',
                    borderRadius: 4, fontSize: 11, color: '#aaa',
                  }}>{t.type}</span>}
                  {isCancelled && <span style={{
                    marginLeft: 8, padding: '2px 6px', background: '#5a2020',
                    borderRadius: 4, fontSize: 11, color: '#fca5a5', fontWeight: 700,
                  }}>CANCELLED</span>}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 600,
                  textDecoration: isCancelled ? 'line-through' : 'none',
                }}>
                  {t.departure_time}
                  {!isCancelled && delay > 0 && <span style={{ color: '#fb923c', marginLeft: 6, fontSize: 13 }}>+{delay}′</span>}
                  {!isCancelled && delay < 0 && <span style={{ color: '#4ade80', marginLeft: 6, fontSize: 13 }}>{delay}′</span>}
                </div>
              </div>
              <div style={{ color: isCancelled ? '#666' : '#aaa', fontSize: 13, marginTop: 4 }}>
                → {t.destination}
                {t.platform && !isCancelled && <span style={{ marginLeft: 8, color: '#666' }}>Plat. {t.platform}</span>}
              </div>
              {!isCancelled && (count > 0 ? (
                <div style={{
                  marginTop: 8, display: 'inline-block', padding: '3px 8px',
                  background: lvl.color + '22', color: lvl.color, borderRadius: 4,
                  fontSize: 12, fontWeight: 600,
                }}>
                  {lvl.emoji} {lvl.label} · {count}
                </div>
              ) : (
                <div style={{
                  marginTop: 8, display: 'inline-block', padding: '3px 8px',
                  background: '#2a2a2a', color: '#888', borderRadius: 4,
                  fontSize: 12, fontWeight: 600,
                }}>
                  ⚪ No data
                </div>
              ))}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
