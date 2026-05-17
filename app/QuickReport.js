'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BUS_LINES } from '@/lib/busLines';

const COOLDOWN_MS = 15 * 60 * 1000;
const RECENT_KEY = 'recent_bus_lines';

function getDeviceId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

function getRecentLineIds() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushRecentLine(id) {
  const list = getRecentLineIds().filter(x => x !== id);
  list.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 4)));
}

export default function QuickReport() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [toast, setToast] = useState(null);
  const [recentIds, setRecentIds] = useState([]);

  useEffect(() => {
    if (open) setRecentIds(getRecentLineIds());
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function report(line) {
    setSubmitting(line.id);
    const key = `bus_last_${line.id}`;
    const last = parseInt(localStorage.getItem(key) || '0', 10);
    if (Date.now() - last < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60000);
      setToast({ type: 'warn', text: `Already reported Line ${line.id} · try again in ${mins} min` });
      setSubmitting(null);
      return;
    }
    const { data, error } = await supabase
      .from('bus_reports')
      .insert({
        line_number: line.id,
        device_id: getDeviceId(),
      })
      .select()
      .single();
    if (error) {
      setToast({ type: 'error', text: 'Could not send report. Try again.' });
    } else {
      const now = Date.now();
      localStorage.setItem(key, String(now));
      localStorage.setItem(`bus_last_id_${line.id}`, data.id);
      pushRecentLine(line.id);
      setToast({ type: 'ok', text: `Reported on Line ${line.id} · thank you` });
      setOpen(false);
    }
    setSubmitting(null);
  }

  const recentLines = recentIds
    .map(id => BUS_LINES.find(l => l.id === id))
    .filter(Boolean);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '16px', fontSize: 17, fontWeight: 700,
          background: '#ff453a', color: '#fff',
          border: 'none', borderRadius: 14,
          cursor: 'pointer', marginBottom: 16,
          letterSpacing: '-0.01em',
          boxShadow: '0 4px 14px rgba(255, 69, 58, 0.2)',
        }}
      >
        Quick Report Inspector
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1c1c1e',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
              maxWidth: 640, width: '100%',
              maxHeight: '85vh', overflowY: 'auto',
              animation: 'sheet-up 0.25s ease-out',
            }}
          >
            <div style={{
              width: 36, height: 5, background: 'rgba(235,235,245,0.3)',
              borderRadius: 3, margin: '0 auto 16px',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{
                fontSize: 22, fontWeight: 700, margin: 0,
                letterSpacing: '-0.025em',
              }}>Where did you spot it?</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: '#2c2c2e', color: '#f5f5f7',
                  border: 'none', borderRadius: '50%',
                  width: 30, height: 30, fontSize: 18, lineHeight: 1,
                  cursor: 'pointer',
                }}
              >×</button>
            </div>

            {recentLines.length > 0 && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'rgba(235, 235, 245, 0.6)', marginBottom: 8,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Recent
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {recentLines.map(line => (
                    <LinePill key={line.id} line={line} onTap={() => report(line)} loading={submitting === line.id} large />
                  ))}
                </div>
              </>
            )}

            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'rgba(235, 235, 245, 0.6)', marginBottom: 8,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              All bus lines · Pavia
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
              {BUS_LINES.map(line => (
                <button
                  key={line.id}
                  onClick={() => report(line)}
                  disabled={submitting === line.id}
                  style={{
                    padding: '16px 8px', background: '#2c2c2e',
                    color: '#f5f5f7', border: 'none', borderRadius: 12,
                    fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em',
                    cursor: submitting === line.id ? 'wait' : 'pointer',
                    opacity: submitting === line.id ? 0.5 : 1,
                  }}
                >
                  {line.id}
                </button>
              ))}
            </div>

            <p style={{
              fontSize: 12, color: 'rgba(235, 235, 245, 0.5)',
              textAlign: 'center', marginTop: 16, marginBottom: 0,
            }}>
              Tap a line to instantly send a report. For trains, use the main search.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: 16, right: 16,
          maxWidth: 600, margin: '0 auto',
          background: toast.type === 'error' ? '#7a1f1f'
                    : toast.type === 'warn' ? '#7a5a1f'
                    : '#1c1c1e',
          color: '#f5f5f7',
          padding: '14px 16px', borderRadius: 12,
          textAlign: 'center', fontSize: 14, fontWeight: 500,
          zIndex: 300,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {toast.text}
        </div>
      )}

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

function LinePill({ line, onTap, loading, large }) {
  return (
    <button
      onClick={onTap}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: large ? '12px 16px' : '8px 14px',
        background: '#2c2c2e', color: '#f5f5f7',
        border: 'none', borderRadius: 12,
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.5 : 1,
      }}
    >
      <span style={{
        width: large ? 36 : 28, height: large ? 36 : 28, borderRadius: 10,
        background: '#3a3a3c',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: large ? 16 : 13, fontWeight: 700, letterSpacing: '-0.02em',
      }}>
        {line.id}
      </span>
      <span style={{
        fontSize: large ? 14 : 13, fontWeight: 500,
        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {line.name}
      </span>
    </button>
  );
}
