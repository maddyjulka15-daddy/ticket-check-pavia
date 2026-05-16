const TRENORD_NAMES = {
  'milano-centrale': 'MILANO_CENTRALE',
  'milano-pgaribaldi': 'MILANO_PORTA_GARIBALDI',
  'milano-rogoredo': 'MILANO_ROGOREDO',
  'milano-cadorna': 'MILANO_CADORNA',
  'milano-bovisa': 'MILANO_BOVISA',
  'malpensa-t2': 'AEROPORTO_MALPENSA_T2',
  'pavia': 'PAVIA',
};

// Omio station IDs (their internal IDs). Best-effort for common stations.
// Empty string falls back to a name-based search URL.
const OMIO_IDS = {
  'milano-centrale': '4084',
  'milano-pgaribaldi': '4090',
  'pavia': '4093',
};

function trenitaliaSearch(fromName, toName) {
  const q = encodeURIComponent(`${fromName} ${toName}`);
  return `https://www.lefrecce.it/Channels.Website.WEB/website/search?query=${q}`;
}

function omioUrl(fromSlug, toSlug, fromName, toName) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  // TODO: replace with your Omio affiliate URL once approved.
  // Format: https://www.omio.com/search-frontend/results?ds=PAVIA&as=MILAN&dd=YYYY-MM-DD
  const from = encodeURIComponent(fromName);
  const to = encodeURIComponent(toName);
  return `https://www.omio.com/search-frontend/results?ds=${from}&as=${to}&dd=${dateStr}`;
}

export function getBuyLinks(fromSlug, toSlug, fromName, toName) {
  const fromCode = TRENORD_NAMES[fromSlug];
  const toCode = TRENORD_NAMES[toSlug];
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const links = [];

  if (fromCode && toCode) {
    links.push({
      label: 'Trenord (ufficiale)',
      sub: 'Prezzo ufficiale, app Trenord',
      url: `https://www.trenord.it/biglietti/acquista?from=${fromCode}&to=${toCode}&date=${dateStr}`,
      kind: 'official',
    });
  }

  links.push({
    label: 'Trenitalia',
    sub: 'Regionali Veloci, IC, Frecce',
    url: trenitaliaSearch(fromName, toName),
    kind: 'official',
  });

  links.push({
    label: 'Omio',
    sub: 'Confronto prezzi, pagamento facile',
    url: omioUrl(fromSlug, toSlug, fromName, toName),
    kind: 'aggregator',
  });

  const from = encodeURIComponent(fromName);
  const to = encodeURIComponent(toName);
  links.push({
    label: 'Trainline',
    sub: 'App popolare in UE, pagamento facile',
    url: `https://www.thetrainline.com/it/biglietti-treno/${from}/${to}?date=${dateStr}`,
    kind: 'aggregator',
  });

  return links;
}
