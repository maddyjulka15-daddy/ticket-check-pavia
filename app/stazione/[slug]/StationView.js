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
      if (station.multi) {
        const results = await Promise.all(
          station.multi.map(async ({ code, label }) => {
            const res = await fetch(`/api/departures/${code}`, { cache: 'no-store' });
            const data = await res.json();
            return (data.trains || []).map(t => ({ ...t, from_label: label }));
          })
        );
        const merged = results.flat();
        const seen = new Set();
        const unique = [];
        for (const t of merged) {
          const key = `${t.train_number}-${t.departure_ts}-${t.from_label}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(t);
        }
        unique.sort((a, b) => (a.departure_ts || 0) - (b.departure_ts || 0));
        setTrains(unique);
      } else {
        const res = await fetch(`/api/departures/${station.code}`, { cache: 'no-store' });
        const data = await res.json();
        setTrains(data.trains || []);
      }
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [station]);

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
      <Link href="/" style={{
        color: '#0a84ff', textDecoration: 'none', fontSize: 15, fontWeight: 500,
      }}>‹ Home</Link>
      <h1 style={{
        fontSize: 30, fontWeight: 700, margin: '16px 0 4px',
        letterSpacing: '-0.025em',
      }}>{station.name}</h1>
      <p style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 14, margin: '0 0 4px' }}>
        Live departures
        {updatedAt && <> · {updatedAt.toLocaleTimeString('en-GB').slice(0,5)}</>}
      </p>
      <p style={{ color: 'rgba(235, 235, 245, 0.3)', fontSize: 12, margin: '0 0 20px' }}>
        Source: ViaggiaTreno
      </p>

      {loading && (
        <div style={{
          color: 'rgba(235, 235, 245, 0.4)', padding: 32, textAlign: 'center',
        }}>Loading…</div>
      )}

      {!loading && trains.length === 0 && (
        <div style={{
          background: '#1c1c1e', padding: 32, borderRadius: 14,
          textAlign: 'center', color: 'rgba(235, 235, 245, 0.6)',
        }}>
          No upcoming trains. Try again later.
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(255, 69, 58, 0.12)', color: '#ff6961',
          padding: 14, borderRadius: 12, fontSize: 13,
        }}>
          {error}
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
              key={t.train_number + t.departure_time + (t.from_label || '')}
              href={`/treno/${t.train_number}`}
              style={{
                display: 'block', padding: 16,
                background: isCancelled ? '#1a1414' : '#1c1c1e',
                borderRadius: 14,
                textDecoration: 'none',
                color: isCancelled ? 'rgba(235, 235, 245, 0.4)' : '#f5f5f7',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{
                    fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em',
                    textDecoration: isCancelled ? 'line-through' : 'none',
                  }}>{t.train_number}</span>
                  {t.type && <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'rgba(235, 235, 245, 0.6)',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>{t.type}</span>}
                </div>
                <div style={{
                  fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em',
                  textDecoration: isCancelled ? 'line-through' : 'none',
                }}>
                  {t.departure_time}
                  {!isCancelled && delay > 0 && <span style={{ color: '#ff9f0a', marginLeft: 6, fontSize: 13, fontWeight: 500 }}>+{delay}′</span>}
                  {!isCancelled && delay < 0 && <span style={{ color: '#30d158', marginLeft: 6, fontSize: 13, fontWeight: 500 }}>{delay}′</span>}
                </div>
              </div>
              <div style={{
                color: isCancelled ? 'rgba(235, 235, 245, 0.3)' : 'rgba(235, 235, 245, 0.7)',
                fontSize: 14, marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
              }}>
                <span>→ {t.destination}</span>
                {t.platform && !isCancelled && <span style={{ color: 'rgba(235, 235, 245, 0.4)' }}>Plat. {t.platform}</span>}
                {t.from_label && <span style={{
                  padding: '2px 8px', background: 'rgba(10, 132, 255, 0.15)',
                  borderRadius: 6, fontSize: 11, color: '#0a84ff', fontWeight: 600,
                }}>from {t.from_label}</span>}
              </div>
              {isCancelled ? (
                <div style={{
                  marginTop: 10, display: 'inline-block', padding: '3px 10px',
                  background: 'rgba(255, 69, 58, 0.15)', color: '#ff6961',
                  borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                }}>
                  CANCELLED
                </div>
              ) : count > 0 ? (
                <div style={{
                  marginTop: 10, display: 'inline-block', padding: '3px 10px',
                  background: lvl.color + '22', color: lvl.color, borderRadius: 6,
                  fontSize: 12, fontWeight: 600,
                }}>
                  {lvl.label} · {count}
                </div>
              ) : (
                <div style={{
                  marginTop: 10, display: 'inline-block', padding: '3px 10px',
                  background: 'rgba(235, 235, 245, 0.08)', color: 'rgba(235, 235, 245, 0.5)',
                  borderRadius: 6, fontSize: 12, fontWeight: 500,
                }}>
                  No reports
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
