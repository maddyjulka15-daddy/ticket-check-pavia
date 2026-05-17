'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { STATIONS } from '@/lib/stations';
import { supabase } from '@/lib/supabase';
import { alertLevel } from '@/lib/level';

const TOWARD_PAVIA = ['pavia','voghera','mortara','alessandria','genova','sestri','ventimiglia','tortona','arquata','novi ligure','la spezia','albairate','vermezzo','savona','livorno','sanremo','bordighera','imperia','finale ligure','asti'];
const TOWARD_MILANO = ['milano','centrale','garibaldi','rogoredo','bovisa','greco','lambrate','cadorna','domodossola','luino','varese','como','lecco','sondrio','tirano','bergamo','brescia','verona','venezia','bologna','garbagnate'];
const TOWARD_MALPENSA = ['malpensa','aeroporto','t1','t2','gallarate','busto','arsizio','rho','saronno','luino','laveno'];

const MILAN_ALL = {
  name: 'Milan (all stations)',
  multi: [
    { code: 'S01700', label: 'Centrale' },
    { code: 'S01645', label: 'P.Garibaldi' },
    { code: 'S01820', label: 'Rogoredo' },
    { code: 'S01066', label: 'Cadorna' },
    { code: 'S01642', label: 'Bovisa' },
  ],
};

function resolveStation(slug) {
  if (slug === 'milano-all') return MILAN_ALL;
  return STATIONS[slug];
}

function matchesDestination(destination, toSlug, toName) {
  if (!destination) return false;
  const d = destination.toLowerCase();
  if (toSlug === 'milano-all') {
    return TOWARD_MILANO.some(k => d.includes(k));
  }
  const tName = (toName || '').toLowerCase();
  if (tName.length > 3 && d.includes(tName)) return true;
  if (toSlug === 'pavia' || toSlug === 'voghera' || toSlug === 'mortara') {
    return TOWARD_PAVIA.some(k => d.includes(k));
  }
  if (toSlug.startsWith('milano')) {
    return TOWARD_MILANO.some(k => d.includes(k));
  }
  if (toSlug.startsWith('malpensa') || toSlug === 'gallarate' || toSlug === 'saronno') {
    return TOWARD_MALPENSA.some(k => d.includes(k));
  }
  return false;
}

export default function SearchView({ fromSlug, toSlug }) {
  const fromStation = resolveStation(fromSlug);
  const toStation = resolveStation(toSlug);
  const [allTrains, setAllTrains] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const loadTrains = useCallback(async () => {
    if (!fromStation || !toStation) {
      setError('Invalid station');
      setLoading(false);
      return;
    }
    try {
      if (fromStation.multi) {
        const results = await Promise.all(
          fromStation.multi.map(async ({ code, label }) => {
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
        setAllTrains(unique);
      } else {
        const res = await fetch(`/api/departures/${fromStation.code}`, { cache: 'no-store' });
        const data = await res.json();
        setAllTrains(data.trains || []);
      }
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [fromStation, toStation]);

  const loadReports = useCallback(async () => {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('reports').select('train_number').gte('created_at', since);
    if (!data) return;
    const counts = {};
    for (const r of data) counts[r.train_number] = (counts[r.train_number] || 0) + 1;
    setReports(counts);
  }, []);

  useEffect(() => {
    loadTrains();
    loadReports();
    const t1 = setInterval(loadTrains, 60000);
    const t2 = setInterval(loadReports, 30000);
    const channel = supabase
      .channel('reports-search')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => loadReports())
      .subscribe();
    return () => { clearInterval(t1); clearInterval(t2); supabase.removeChannel(channel); };
  }, [loadTrains, loadReports]);

  if (!fromStation || !toStation) {
    return (
      <main>
        <Link href="/" style={{ color: '#888' }}>← Home</Link>
        <p>Invalid stations.</p>
      </main>
    );
  }

  const matched = allTrains.filter(t => matchesDestination(t.destination, toSlug, toStation.name));
  const trains = showAll ? allTrains : (matched.length > 0 ? matched : allTrains);
  const noMatchButHasTrains = matched.length === 0 && allTrains.length > 0 && !showAll;

  return (
    <main>
      <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>← Search</Link>
      <h1 style={{ fontSize: 22, margin: '12px 0 4px' }}>
        {fromStation.name} → {toStation.name}
      </h1>
      <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 4px' }}>
        Real-time departures
        {updatedAt && <> · updated {updatedAt.toLocaleTimeString('en-GB').slice(0,5)}</>}
      </p>
      <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px' }}>
        {matched.length > 0 && !showAll
          ? `${matched.length} trains to ${toStation.name}`
          : `All departures from ${fromStation.name}`}
      </p>

      {noMatchButHasTrains && (
        <div style={{ background: '#1a1a1a', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#aaa', border: '1px solid #2a2a2a' }}>
          No direct route between these stations. Showing all departures from {fromStation.name} — you may need to change trains.
        </div>
      )}

      {loading && <div style={{ color: '#888', padding: 24, textAlign: 'center' }}>Loading…</div>}

      {!loading && allTrains.length === 0 && (
        <div style={{ background: '#1a1a1a', padding: 24, borderRadius: 12, textAlign: 'center', color: '#888' }}>
          No upcoming trains. Try again later.
        </div>
      )}

      {error && (
        <div style={{ background: '#3a1a1a', color: '#fca5a5', padding: 12, borderRadius: 8, fontSize: 12 }}>
          Error: {error}
        </div>
      )}

      {matched.length > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            background: 'transparent', color: '#7dd3fc', border: '1px solid #2a2a2a',
            padding: '6px 10px', borderRadius: 6, fontSize: 12, marginBottom: 12, cursor: 'pointer',
          }}
        >
          {showAll ? `Only to ${toStation.name}` : 'Show all departures'}
        </button>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {trains.map((t) => {
          const count = reports[t.train_number] || 0;
          const lvl = alertLevel(count);
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
                    fontWeight: 700, fontSize: 16,
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
                  {!isCancelled && t.delay_minutes > 0 && <span style={{ color: '#fb923c', marginLeft: 6, fontSize: 13 }}>+{t.delay_minutes}′</span>}
                  {!isCancelled && t.delay_minutes < 0 && <span style={{ color: '#4ade80', marginLeft: 6, fontSize: 13 }}>{t.delay_minutes}′</span>}
                </div>
              </div>
              <div style={{ color: isCancelled ? '#666' : '#aaa', fontSize: 13, marginTop: 4 }}>
                → {t.destination}
                {t.platform && !isCancelled && <span style={{ marginLeft: 8, color: '#666' }}>Plat. {t.platform}</span>}
                {t.from_label && <span style={{
                  marginLeft: 8, padding: '1px 6px', background: '#1a2942',
                  borderRadius: 4, fontSize: 11, color: '#7dd3fc',
                }}>from {t.from_label}</span>}
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
