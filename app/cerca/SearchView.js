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

function findMatchingStop(stops, toStationName) {
  if (!stops || !toStationName) return null;
  const target = toStationName.toLowerCase().replace(/[.\s]/g, '');
  for (const s of stops) {
    const n = (s.name || '').toLowerCase().replace(/[.\s]/g, '');
    if (!n) continue;
    if (n === target || n.includes(target) || target.includes(n)) {
      return s;
    }
  }
  return null;
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
  const [arrivals, setArrivals] = useState({});

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

  // Enrich each train with arrival time at the destination by fetching its stops.
  // Throttled to 3 concurrent requests to avoid hammering ViaggiaTreno.
  useEffect(() => {
    if (!toStation || !toStation.name || allTrains.length === 0) return;
    if (toSlug === 'milano-all') return; // No single station to match against.

    let cancelled = false;
    const toCheck = allTrains.filter(t => !arrivals[t.train_number]);
    if (toCheck.length === 0) return;

    async function fetchOne(t) {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/train-stops?trainNumber=${t.train_number}`);
        const data = await res.json();
        if (cancelled) return;
        const match = findMatchingStop(data.stops, toStation.name);
        setArrivals(prev => ({
          ...prev,
          [t.train_number]: {
            passes: !!match,
            time: match ? (match.actualArrival || match.scheduledArrival || match.actualDeparture || match.scheduledDeparture) : null,
          },
        }));
      } catch {
        if (!cancelled) {
          setArrivals(prev => ({ ...prev, [t.train_number]: { passes: false, time: null } }));
        }
      }
    }

    async function processBatches() {
      const concurrent = 3;
      const queue = [...toCheck];
      while (queue.length > 0 && !cancelled) {
        const batch = queue.splice(0, concurrent);
        await Promise.all(batch.map(fetchOne));
      }
    }
    processBatches();

    return () => { cancelled = true; };
  }, [allTrains, toStation, toSlug]);

  if (!fromStation || !toStation) {
    return (
      <main>
        <Link href="/" style={{ color: '#0a84ff', textDecoration: 'none' }}>‹ Home</Link>
        <p style={{ color: 'rgba(235, 235, 245, 0.6)' }}>Invalid stations.</p>
      </main>
    );
  }

  const matched = allTrains.filter(t => matchesDestination(t.destination, toSlug, toStation.name));
  const trains = showAll ? allTrains : (matched.length > 0 ? matched : allTrains);
  const noMatchButHasTrains = matched.length === 0 && allTrains.length > 0 && !showAll;

  return (
    <main>
      <Link href="/" style={{
        color: '#0a84ff', textDecoration: 'none', fontSize: 15, fontWeight: 500,
      }}>‹ Search</Link>
      <h1 style={{
        fontSize: 26, fontWeight: 700, margin: '16px 0 4px',
        letterSpacing: '-0.025em',
      }}>
        {fromStation.name} → {toStation.name}
      </h1>
      <p style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 14, margin: '0 0 4px' }}>
        Live departures
        {updatedAt && <> · {updatedAt.toLocaleTimeString('en-GB').slice(0,5)}</>}
      </p>
      <p style={{ color: 'rgba(235, 235, 245, 0.3)', fontSize: 12, margin: '0 0 20px' }}>
        {matched.length > 0 && !showAll
          ? `${matched.length} train${matched.length === 1 ? '' : 's'} to ${toStation.name}`
          : `All departures from ${fromStation.name}`}
      </p>

      {noMatchButHasTrains && (
        <div style={{
          background: '#1c1c1e', padding: '12px 14px', borderRadius: 12,
          marginBottom: 14, fontSize: 13,
          color: 'rgba(235, 235, 245, 0.6)', lineHeight: 1.4,
        }}>
          No direct route between these stations. Showing all departures from {fromStation.name} — you may need to change trains.
        </div>
      )}

      {loading && <div style={{ color: 'rgba(235, 235, 245, 0.4)', padding: 32, textAlign: 'center' }}>Loading…</div>}

      {!loading && allTrains.length === 0 && (
        <div style={{ background: '#1c1c1e', padding: 32, borderRadius: 14, textAlign: 'center', color: 'rgba(235, 235, 245, 0.6)' }}>
          No upcoming trains. Try again later.
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(255, 69, 58, 0.12)', color: '#ff6961', padding: 14, borderRadius: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {matched.length > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            background: 'transparent', color: '#0a84ff',
            border: '1px solid rgba(10, 132, 255, 0.3)',
            padding: '7px 12px', borderRadius: 8, fontSize: 13,
            fontWeight: 500, marginBottom: 14, cursor: 'pointer',
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
                    fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em',
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
                  {!isCancelled && t.delay_minutes > 0 && <span style={{ color: '#ff9f0a', marginLeft: 6, fontSize: 13, fontWeight: 500 }}>+{t.delay_minutes}′</span>}
                  {!isCancelled && t.delay_minutes < 0 && <span style={{ color: '#30d158', marginLeft: 6, fontSize: 13, fontWeight: 500 }}>{t.delay_minutes}′</span>}
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
              {!isCancelled && (() => {
                const a = arrivals[t.train_number];
                if (!a) {
                  return (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(235, 235, 245, 0.35)' }}>
                      Checking route…
                    </div>
                  );
                }
                if (a.passes && a.time) {
                  return (
                    <div style={{
                      marginTop: 6, fontSize: 13, fontWeight: 600,
                      color: '#30d158', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      Arrives {toStation.name} · {a.time}
                    </div>
                  );
                }
                return (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(235, 235, 245, 0.4)' }}>
                    Does not stop at {toStation.name}
                  </div>
                );
              })()}
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
