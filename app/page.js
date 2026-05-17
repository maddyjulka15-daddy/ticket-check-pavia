'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATION_LIST } from '@/lib/stations';

const isSpecificMilanStation = (slug) => slug && slug.startsWith('milano-') && slug !== 'milano-all';

export default function Home() {
  const router = useRouter();
  const [from, setFrom] = useState('milano-centrale');
  const [to, setTo] = useState('pavia');
  const [error, setError] = useState('');

  function search(e) {
    e.preventDefault();
    setError('');
    if (from === to) {
      setError("FROM and TO can't be the same.");
      return;
    }
    if ((from === 'milano-all' && isSpecificMilanStation(to)) ||
        (to === 'milano-all' && isSpecificMilanStation(from))) {
      setError("'Milan (all stations)' can't be combined with a specific Milan station. Pick a non-Milan destination.");
      return;
    }
    router.push(`/cerca?from=${from}&to=${to}`);
  }

  function swap() {
    setError('');
    setFrom(to);
    setTo(from);
  }

  return (
    <main>
      <h1 style={{ fontSize: 30, margin: '0 0 4px' }}>Occhio</h1>
      <p style={{ color: '#aaa', margin: '0 0 20px', fontSize: 14 }}>
        Search trains and see live inspector alerts.
      </p>

      <form onSubmit={search} style={{
        background: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 24,
        border: '1px solid #2a2a2a',
      }}>
        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>FROM</label>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{
            width: '100%', padding: 12, fontSize: 16, marginBottom: 12,
            background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8,
          }}
        >
          <option value="milano-all">🏙️ Milan (all stations)</option>
          {STATION_LIST.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>

        <button
          type="button"
          onClick={swap}
          style={{
            display: 'block', margin: '0 auto 12px', padding: '6px 14px',
            background: '#2a2a2a', color: '#aaa', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontSize: 13,
          }}
        >↑↓ Swap</button>

        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>TO</label>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{
            width: '100%', padding: 12, fontSize: 16, marginBottom: 16,
            background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8,
          }}
        >
          <option value="milano-all">🏙️ Milan (all stations)</option>
          {STATION_LIST.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>

        <button
          type="submit"
          style={{
            width: '100%', padding: 14, fontSize: 16, fontWeight: 700,
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer',
          }}
        >🔍 Search trains</button>

        {error && (
          <div style={{
            marginTop: 12, padding: 10, background: '#3a1a1a',
            color: '#fca5a5', borderRadius: 8, fontSize: 13,
            border: '1px solid #5a2020',
          }}>
            {error}
          </div>
        )}
      </form>

      <details style={{ background: '#1a1a1a', padding: 12, borderRadius: 10, border: '1px solid #2a2a2a' }}>
        <summary style={{ cursor: 'pointer', color: '#aaa', fontSize: 13 }}>
          Or pick a departure station →
        </summary>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <Link
            href="/stazione/milano-all"
            style={{
              padding: '10px 12px', background: '#1a2942',
              borderRadius: 6, textDecoration: 'none', color: '#fff', fontSize: 14,
              border: '1px solid #3b82f6', fontWeight: 600,
            }}
          >
            🏙️ Milan (all stations)
          </Link>
          {STATION_LIST.map(s => (
            <Link
              key={s.slug}
              href={`/stazione/${s.slug}`}
              style={{
                padding: '10px 12px', background: '#0a0a0a',
                borderRadius: 6, textDecoration: 'none', color: '#fff', fontSize: 14,
                border: '1px solid #2a2a2a',
              }}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </details>
    </main>
  );
}
