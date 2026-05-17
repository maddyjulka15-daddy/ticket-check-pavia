import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

function formatViaggiaTrenoTimestamp(date) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = days[date.getUTCDay()];
  const mo = months[date.getUTCMonth()];
  const dd = String(date.getUTCDate()).padStart(2,'0');
  const yyyy = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2,'0');
  const mm = String(date.getUTCMinutes()).padStart(2,'0');
  const ss = String(date.getUTCSeconds()).padStart(2,'0');
  return `${d} ${mo} ${dd} ${yyyy} ${hh}:${mm}:${ss} GMT+0000`;
}

async function fetchOne(code, date) {
  const ts = formatViaggiaTrenoTimestamp(date);
  const url = `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${code}/${encodeURIComponent(ts)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || text.trim() === '') return [];
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function clearReportsForCancelled(trainNumbers) {
  if (trainNumbers.length === 0) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    const sb = createClient(url, key);
    await sb.from('reports').delete().in('train_number', trainNumbers);
  } catch {
    // swallow — not critical
  }
}

export async function GET(_req, { params }) {
  const { code } = await params;
  const now = new Date();
  const windows = [0, 30, 60, 90, 120, 150, 180, 210, 240].map(m => new Date(now.getTime() + m * 60000));
  const results = await Promise.all(windows.map(d => fetchOne(code, d)));
  const seen = new Set();
  const merged = [];
  const cancelledNumbers = [];
  for (const arr of results) {
    for (const t of arr) {
      const key = `${t.numeroTreno}-${t.orarioPartenza}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cancelled = !!t.nonPartito;
      if (cancelled) cancelledNumbers.push(String(t.numeroTreno));
      merged.push({
        train_number: String(t.numeroTreno),
        destination: t.destinazione || '',
        departure_time: t.compOrarioPartenza || '',
        departure_ts: t.orarioPartenza,
        type: t.categoria || t.categoriaDescrizione || '',
        delay_minutes: typeof t.ritardo === 'number' ? t.ritardo : 0,
        platform: t.binarioProgrammatoPartenzaDescrizione || t.binarioEffettivoPartenzaDescrizione || '',
        cancelled,
      });
    }
  }

  // Fire and forget — clear reports for cancelled trains
  if (cancelledNumbers.length > 0) {
    clearReportsForCancelled([...new Set(cancelledNumbers)]).catch(() => {});
  }

  // Filter out cancelled from visible list (or keep with a flag — your choice)
  const visible = merged.filter(t => !t.cancelled);
  visible.sort((a, b) => (a.departure_ts || 0) - (b.departure_ts || 0));

  return Response.json({
    trains: visible,
    cancelled_count: cancelledNumbers.length,
    fetched_at: now.toISOString(),
  });
}
