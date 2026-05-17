'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BUS_LINES } from '@/lib/busLines';
import { supabase } from '@/lib/supabase';

const WINDOW_MS = 60 * 60 * 1000;

function busAlertLevel(count) {
  if (count >= 5) return { label: 'High', color: '#ff453a' };
  if (count >= 2) return { label: 'Active', color: '#ff9f0a' };
  if (count >= 1) return { label: 'Reported', color: '#ffd60a' };
  return { label: 'No reports', color: 'rgba(235, 235, 245, 0.5)' };
}

export default function BusListView() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data } = await supabase
      .from('bus_reports')
      .select('line_number')
      .gte('created_at', since);
    if (!data) {
      setLoading(false);
      return;
    }
    const c = {};
    for (const r of data) c[r.line_number] = (c[r.line_number] || 0) + 1;
    setCounts(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCounts();
    const t = setInterval(loadCounts, 30000);
    const channel = supabase
      .channel('bus-reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_reports' }, () => loadCounts())
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(channel); };
  }, [loadCounts]);

  const urban = BUS_LINES.filter(l => l.type === 'urban');
  const suburban = BUS_LINES.filter(l => l.type === 'suburban');

  return (
    <main>
      <Link href="/" style={{
        color: '#0a84ff', textDecoration: 'none', fontSize: 15, fontWeight: 500,
      }}>‹ Home</Link>
      <h1 style={{
        fontSize: 30, fontWeight: 700, margin: '16px 0 4px',
        letterSpacing: '-0.025em',
      }}>Buses · Pavia</h1>
      <p style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 14, margin: '0 0 4px' }}>
        Autoguidovie urban + suburban lines
      </p>
      <p style={{ color: 'rgba(235, 235, 245, 0.3)', fontSize: 12, margin: '0 0 24px' }}>
        Inspector reports from the last 60 minutes
      </p>

      <div style={{
        fontSize: 11, fontWeight: 600,
        color: 'rgba(235, 235, 245, 0.6)', marginBottom: 8,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        Urban
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        {urban.map(line => {
          const count = counts[line.id] || 0;
          const lvl = busAlertLevel(count);
          return (
            <Link
              key={line.id}
              href={`/bus/${line.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 16, background: '#1c1c1e', borderRadius: 14,
                textDecoration: 'none', color: '#f5f5f7', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: '#2c2c2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
                  flexShrink: 0,
                }}>
                  {line.id}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
                    {line.name}
                  </div>
                  <div style={{
                    fontSize: 12, color: lvl.color, fontWeight: 600, marginTop: 2,
                  }}>
                    {lvl.label}{count > 0 ? ` · ${count}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ color: 'rgba(235, 235, 245, 0.3)', fontSize: 20 }}>›</div>
            </Link>
          );
        })}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 600,
        color: 'rgba(235, 235, 245, 0.6)', marginBottom: 8,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        Suburban
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {suburban.map(line => {
          const count = counts[line.id] || 0;
          const lvl = busAlertLevel(count);
          return (
            <Link
              key={line.id}
              href={`/bus/${line.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 16, background: '#1c1c1e', borderRadius: 14,
                textDecoration: 'none', color: '#f5f5f7', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: '#2c2c2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
                  flexShrink: 0,
                }}>
                  {line.id}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
                    {line.name}
                  </div>
                  <div style={{
                    fontSize: 12, color: lvl.color, fontWeight: 600, marginTop: 2,
                  }}>
                    {lvl.label}{count > 0 ? ` · ${count}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ color: 'rgba(235, 235, 245, 0.3)', fontSize: 20 }}>›</div>
            </Link>
          );
        })}
      </div>

      {loading && <p style={{ color: 'rgba(235, 235, 245, 0.4)', fontSize: 13, textAlign: 'center', marginTop: 16 }}>Loading reports…</p>}
    </main>
  );
}
