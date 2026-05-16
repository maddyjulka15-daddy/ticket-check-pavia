export const STATIONS = {
  // Milano hubs
  'milano-centrale': { name: 'Milano Centrale', code: 'S01700' },
  'milano-pgaribaldi': { name: 'Milano P.Garibaldi', code: 'S01645' },
  'milano-cadorna': { name: 'Milano Cadorna', code: 'S01608' },
  'milano-pgenova': { name: 'Milano P.Genova', code: 'S01646' },
  'milano-bovisa': { name: 'Milano Bovisa', code: 'S01606' },

  // Malpensa
  'malpensa-t1': { name: 'Malpensa Aeroporto T1', code: 'S00865' },
  'malpensa-t2': { name: 'Malpensa Aeroporto T2', code: 'S00866' },

  // Pavia
  'pavia': { name: 'Pavia', code: 'S01632' },
};

export const STATION_LIST = Object.entries(STATIONS).map(([slug, s]) => ({ slug, ...s }));
