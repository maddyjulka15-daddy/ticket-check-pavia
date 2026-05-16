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

// Hardcoded line knowledge for the MXP↔MI↔PV corridor.
// Maps destination keywords → list of station codes the train passes through.
const LINE_DESTINATIONS = {
  // Southbound from Milano: trains heading toward these pass through Pavia
  toward_pavia: ['pavia','voghera','mortara','alessandria','genova','sestri','ventimiglia','tortona','arquata','novi ligure','albairate','vermezzo','la spezia'],
  // Northbound from Pavia: pass through Milano
  toward_milano: ['milano','centrale','garibaldi','rogoredo','bovisa','greco','lambrate','cadorna','domodossola','luino','varese','como','lecco','sondrio','tirano','bergamo','brescia','verona','venezia','bologna','garbagnate'],
  // Toward Malpensa from Milano
  toward_malpensa: ['malpensa','aeroporto','t1','t2','gallarate','busto','arsizio','rho','saronno','luino','laveno','porto ceresio'],
};

function destinationMatchesTarget(destinazione, toSlug, toName) {
  if (!destinazione) return false;
  const d = destinazione.toLowerCase();
  const tName = (toName || '').toLowerCase();

  // Direct: train terminates AT the target station
  if (d.includes(tName) && tName.length > 3) return true;

  // Heuristic by target slug
  if (toSlug === 'pavia' || toSlug.startsWith('certosa') || toSlug.includes('voghera') || toSlug.includes('mortara') || toSlug.includes('san-martino')) {
    return LINE_DESTINATIONS.toward_pavia.some(k => d.includes(k));
  }
  if (toSlug.startsWith('milano') || toSlug.startsWith('rogoredo') || toSlug === 'locate-triulzi' || toSlug === 'villamaggiore' || toSlug === 'pieve-emanuele') {
    return LINE_DESTINATIONS.toward_milano.some(k => d.includes(k));
  }
  if (toSlug.startsWith('malpensa') || toSlug === 'rho' || toSlug === 'busto-arsizio' || toSlug === 'gallarate' || toSlug === 'saronno') {
    return LINE_DESTINATIONS.toward_malpensa.some(k => d.includes(k));
  }
  return false;
}

export async function GET(req) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const toName = url.searchParams.get('toName') || '';
  const toSlug = url.searchParams.get('toSlug') || '';
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

  const filtered = candidates.filter(t => destinationMatchesTarget(t.destinazione, toSlug, toName));
  // If filter returns nothing, fall back to ALL departures so user still sees something
  const finalList = filtered.length > 0 ? filtered : candidates;
  finalList.sort((a, b) => (a.orarioPartenza || 0) - (b.orarioPartenza || 0));

  const trains = finalList.map(t => ({
    train_number: String(t.numeroTreno),
    from_name: t.origine || '',
    to_name: t.destinazione || '',
    departure_time: t.compOrarioPartenza || '',
    departure_ts: t.orarioPartenza,
    type: t.categoria || t.categoriaDescrizione || '',
    delay_minutes: typeof t.ritardo === 'number' ? t.ritardo : 0,
    platform: t.binarioProgrammatoPartenzaDescrizione || t.binarioEffettivoPartenzaDescrizione || '',
    cancelled: !!t.nonPartito,
  }));

  return Response.json({
    trains,
    fetched_at: now.toISOString(),
    filtered: filtered.length > 0,
  });
}
