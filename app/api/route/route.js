function formatTs(date) {
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

async function fetchDepartures(code, date) {
  const ts = formatTs(date);
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

async function fetchStops(trainNumber, originCode) {
  const url = `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/tratteCanvas/${originCode}/${trainNumber}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const toName = (url.searchParams.get('toName') || '').toLowerCase();
  if (!from || !to) {
    return Response.json({ error: 'Missing from or to' }, { status: 400 });
  }

  const now = new Date();
  const windows = [0, 30, 60, 90, 120].map(m => new Date(now.getTime() + m * 60000));
  const all = await Promise.all(windows.map(d => fetchDepartures(from, d)));
  const seen = new Set();
  const candidates = [];
  for (const arr of all) {
    for (const t of arr) {
      const key = `${t.numeroTreno}-${t.orarioPartenza}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(t);
    }
  }
  candidates.sort((a, b) => (a.orarioPartenza || 0) - (b.orarioPartenza || 0));

  const top = candidates.slice(0, 25);
  const checked = await Promise.all(top.map(async (t) => {
    const dest = (t.destinazione || '').toLowerCase();
    const directMatch = toName && (dest === toName || dest.includes(toName));
    if (directMatch) {
      return { ...t, matchedStop: t.destinazione, scheduledArrival: null, viaDirect: true };
    }
    const stops = await fetchStops(t.numeroTreno, from);
    if (!stops || !Array.isArray(stops)) return null;
    const match = stops.find(s => {
      const id = s.stazione?.id || s.idFermata || '';
      const name = (s.stazione?.nomeLungo || s.stazione?.nomeBreve || '').toLowerCase();
      return id === to || (toName && name === toName);
    });
    if (!match) return null;
    return {
      ...t,
      matchedStop: match.stazione?.nomeLungo || match.stazione?.nomeBreve || '',
      scheduledArrival: match.programmata || match.orarioArrivoProgrammato || null,
      viaDirect: false,
    };
  }));

  const trains = checked.filter(Boolean).map(t => ({
    train_number: String(t.numeroTreno),
    from_name: t.origine || '',
    to_name: t.matchedStop || t.destinazione || '',
    final_destination: t.destinazione || '',
    departure_time: t.compOrarioPartenza || '',
    departure_ts: t.orarioPartenza,
    arrival_ts: t.scheduledArrival,
    type: t.categoria || t.categoriaDescrizione || '',
    delay_minutes: typeof t.ritardo === 'number' ? t.ritardo : 0,
    platform: t.binarioProgrammatoPartenzaDescrizione || t.binarioEffettivoPartenzaDescrizione || '',
    cancelled: !!t.nonPartito,
  }));

  return Response.json({ trains, fetched_at: now.toISOString() });
}
