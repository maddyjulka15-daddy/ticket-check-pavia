export const STATIONS = {
  // Milano hubs
  'milano-centrale': { name: 'Milano Centrale', code: 'S01700' },
  'milano-pgaribaldi': { name: 'Milano P.Garibaldi', code: 'S01645' },
  'milano-cadorna': { name: 'Milano Cadorna', code: 'S01608' },
  'milano-pgenova': { name: 'Milano P.Genova', code: 'S01646' },
  'milano-rogoredo': { name: 'Milano Rogoredo', code: 'S01682' },
  'milano-bovisa': { name: 'Milano Bovisa', code: 'S01606' },
  'milano-grecopirelli': { name: 'Milano Greco Pirelli', code: 'S01633' },
  'milano-lambrate': { name: 'Milano Lambrate', code: 'S01634' },
  'milano-domodossola': { name: 'Milano Domodossola', code: 'S01619' },

  // Malpensa
  'malpensa-t1': { name: 'Malpensa Aeroporto T1', code: 'S00865' },
  'malpensa-t2': { name: 'Malpensa Aeroporto T2', code: 'S00866' },

  // Pavia + south
  'pavia': { name: 'Pavia', code: 'S01632' },
  'certosa-di-pavia': { name: 'Certosa di Pavia', code: 'S01624' },
  'san-martino-siccomario': { name: 'San Martino Siccomario', code: 'S01665' },
  'mortara': { name: 'Mortara', code: 'S01636' },
  'voghera': { name: 'Voghera', code: 'S01698' },

  // Between Milano & Pavia
  'rogoredo': { name: 'Rogoredo', code: 'S01682' },
  'locate-triulzi': { name: 'Locate Triulzi', code: 'S01629' },
  'villamaggiore': { name: 'Villamaggiore', code: 'S01695' },
  'pieve-emanuele': { name: 'Pieve Emanuele', code: 'S01657' },

  // Between Milano & Malpensa
  'rho': { name: 'Rho', code: 'S01680' },
  'busto-arsizio': { name: 'Busto Arsizio', code: 'S00910' },
  'gallarate': { name: 'Gallarate', code: 'S01018' },
  'saronno': { name: 'Saronno', code: 'S01685' },
};

export const STATION_LIST = Object.entries(STATIONS).map(([slug, s]) => ({ slug, ...s }));
