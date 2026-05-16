export const STATIONS = {
  'milano-centrale': { name: 'Milano Centrale', code: 'S01700' },
  'milano-pgaribaldi': { name: 'Milano P.Garibaldi', code: 'S01645' },
  'milano-rogoredo': { name: 'Milano Rogoredo', code: 'S01682' },
  'milano-cadorna': { name: 'Milano Cadorna', code: 'S01608' },
  'milano-bovisa': { name: 'Milano Bovisa', code: 'S01606' },
  'malpensa-t2': { name: 'Malpensa Aeroporto T2', code: 'S00866' },
  'pavia': { name: 'Pavia', code: 'S01632' },
};

export const STATION_LIST = Object.entries(STATIONS).map(([slug, s]) => ({ slug, ...s }));
