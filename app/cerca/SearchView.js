'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { STATIONS } from '@/lib/stations';
import { supabase } from '@/lib/supabase';
import { alertLevel } from '@/lib/level';

export default function SearchView({ fromSlug, toSlug }) {
  const fromStation = STATIONS[fromSlug];
  const toStation = STATIONS[toSlug];
  const [trains, setTrains] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadTrains = useCallback(async () => {
    if (!fromStation || !toStation) {
      setError('Stazione non valida');
      setLoading(false);
      return;
    }
    try {
      const u = `/api/route?from=${fromStation.code}&to=${toStation.code}&toName=${encodeURIComponent(toStation.name)}`;
      const res = await fetch(u, { cache: 'no-store' });
      const data = await res.json();
      setTrains(data.trains || []);
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
        <p>Stazioni non valide.</p>
      </main>
    );
  }

  return (
    <main>
      <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>← Cerca</Link>
      <h1 style={{ fontSize: 22, margin: '12px 0 4px' }}>
        {fromStation.name} → {toStation.name}
      </h1>
      <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 16px' }}>
        Partenze in tempo reale
        {updatedAt && <> · agg. {updatedAt.toLocaleTimeString('it-IT').slice(0,5)}</>}
      </p>

      {loading && <div style={{ color: '#888', padding: 24, textAlign: 'center' }}>Caricamento…</div>}

      {!loading && trains.length === 0 && (
        <div style={{ background: '#1a1a1a', padding: 24, borderRadius: 12, textAlign: 'center', color: '#888' }}>
          Nessun treno diretto trovato. Prova un'altra tratta o riprova più tardi.
        </div>
      )}

      {error && (
        <div style={{ background: '#3a1a1a', color: '#fca5a5', padding: 12, borderRadius: 8, fontSize: 12 }}>
          Errore: {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {trains.map((t) => {
          const count = reports[t.train_number] || 0;
          const lvl = alertLevel(count);
          return (
            <Link
              key={t.train_number + t.departure_time}
              href={`/treno/${t.train_number}`}
              style={{
                display: 'block', padding: 14, background: '#1a1a1a',
                borderRadius: 10, border: '1px solid #2a2a2a',
                textDecoration: 'none', color: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{t.train_number}</span>
                  {t.type && <span style={{
                    marginLeft: 8, padding: '2px 6px', background: '#2a2a2a',
                    borderRadius: 4, fontSize: 11, color: '#aaa',
                  }}>{t.type}</span>}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {t.departure_time}
                  {t.delay_minutes > 0 && <span style={{ color: '#fb923c', marginLeft: 6, fontSize: 13 }}>+{t.delay_minutes}′</span>}
                  {t.delay_minutes < 0 && <span style={{ color: '#4ade80', marginLeft: 6, fontSize: 13 }}>{t.delay_minutes}′</span>}
                </div>
              </div>
              <div style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>
                → {t.to_name}
                {t.platform && <span style={{ marginLeft: 8, color: '#666' }}>Bin. {t.platform}</span>}
              </div>
              {count > 0 ? (
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
                  ⚪ Nessun dato
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
