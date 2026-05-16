'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATION_LIST } from '@/lib/stations';

export default function Home() {
  const router = useRouter();
  const [from, setFrom] = useState('milano-centrale');
  const [to, setTo] = useState('pavia');

  function search(e) {
    e.preventDefault();
    if (from === to) return;
    router.push(`/cerca?from=${from}&to=${to}`);
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <main>
      <h1 style={{ fontSize: 30, margin: '0 0 4px' }}>Ticket Check Pavia</h1>
      <p style={{ color: '#aaa', margin: '0 0 20px', fontSize: 14 }}>
        Cerca treni Milano · Pavia · Malpensa. Segnalazioni controllori in tempo reale.
      </p>

      <form onSubmit={search} style={{
        background: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 24,
        border: '1px solid #2a2a2a',
      }}>
        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>DA</label>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{
            width: '100%', padding: 12, fontSize: 16, marginBottom: 12,
            background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8,
          }}
        >
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
        >↑↓ Inverti</button>

        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>A</label>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{
            width: '100%', padding: 12, fontSize: 16, marginBottom: 16,
            background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8,
          }}
        >
          {STATION_LIST.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>

        <button
          type="submit"
          style={{
            width: '100%', padding: 14, fontSize: 16, fontWeight: 700,
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer',
          }}
        >🔍 Cerca treni</button>
      </form>

      <details style={{ background: '#1a1a1a', padding: 12, borderRadius: 10, border: '1px solid #2a2a2a' }}>
        <summary style={{ cursor: 'pointer', color: '#aaa', fontSize: 13 }}>
          Oppure scegli una stazione di partenza →
        </summary>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
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
