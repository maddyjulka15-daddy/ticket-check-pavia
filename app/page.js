'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATION_LIST } from '@/lib/stations';

const isSpecificMilanStation = (slug) => slug && slug.startsWith('milano-') && slug !== 'milano-all';

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(235, 235, 245, 0.6)', marginBottom: 8,
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const selectStyle = {
  width: '100%', padding: '14px 16px', fontSize: 17, fontWeight: 500,
  background: '#2c2c2e', color: '#f5f5f7',
  border: 'none', borderRadius: 12,
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27 viewBox=%270 0 10 6%27%3E%3Cpath fill=%27%23f5f5f7%27 d=%27M5 6L0 0h10z%27/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 18px center',
  backgroundSize: '10px 6px',
  paddingRight: 40,
};

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
      setError("Milan (all stations) can't be combined with a specific Milan station.");
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
      <h1 style={{
        fontSize: 40, fontWeight: 700, margin: '8px 0 6px',
        letterSpacing: '-0.03em',
      }}>Occhio</h1>
      <p style={{
        color: 'rgba(235, 235, 245, 0.6)', margin: '0 0 28px',
        fontSize: 15, lineHeight: 1.4,
      }}>
        Live train departures and community alerts for Lombardy.
      </p>

      <form onSubmit={search} style={{
        background: '#1c1c1e', padding: '20px 18px',
        borderRadius: 16, marginBottom: 24,
      }}>
        <label style={labelStyle}>From</label>
        <select value={from} onChange={(e) => setFrom(e.target.value)} style={selectStyle}>
          <option value="milano-all">Milan (all stations)</option>
          {STATION_LIST.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>

        <button
          type="button"
          onClick={swap}
          aria-label="Swap"
          style={{
            display: 'block', margin: '14px auto',
            width: 36, height: 36, padding: 0,
            background: '#2c2c2e', color: '#f5f5f7',
            border: 'none', borderRadius: '50%',
            cursor: 'pointer', fontSize: 18, lineHeight: '36px',
          }}
        >⇅</button>

        <label style={labelStyle}>To</label>
        <select value={to} onChange={(e) => setTo(e.target.value)} style={{ ...selectStyle, marginBottom: 20 }}>
          <option value="milano-all">Milan (all stations)</option>
          {STATION_LIST.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>

        <button
          type="submit"
          style={{
            width: '100%', padding: '16px', fontSize: 17, fontWeight: 600,
            background: '#0a84ff', color: '#fff',
            border: 'none', borderRadius: 12,
            cursor: 'pointer', letterSpacing: '-0.01em',
          }}
        >Search</button>

        {error && (
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'rgba(255, 69, 58, 0.12)',
            color: '#ff6961', borderRadius: 10, fontSize: 13,
            lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}
      </form>

      <details style={{
        background: '#1c1c1e', padding: '14px 16px',
        borderRadius: 14,
      }}>
        <summary style={{
          cursor: 'pointer', color: 'rgba(235, 235, 245, 0.6)',
          fontSize: 14, fontWeight: 500, listStyle: 'none',
        }}>
          Browse by station
        </summary>
        <div style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          <Link
            href="/stazione/milano-all"
            style={{
              padding: '13px 14px', background: '#2c2c2e',
              borderRadius: 10, textDecoration: 'none',
              color: '#f5f5f7', fontSize: 15, fontWeight: 500,
            }}
          >
            Milan (all stations)
          </Link>
          {STATION_LIST.map(s => (
            <Link
              key={s.slug}
              href={`/stazione/${s.slug}`}
              style={{
                padding: '13px 14px', background: '#2c2c2e',
                borderRadius: 10, textDecoration: 'none',
                color: '#f5f5f7', fontSize: 15, fontWeight: 500,
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
