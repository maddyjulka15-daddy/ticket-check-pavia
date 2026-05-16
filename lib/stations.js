// Only stations that work as ORIGINS in ViaggiaTreno's /partenze endpoint.
// (Small pass-through stations like Rogoredo, Certosa, San Martino return empty
// because trains don't originate there — they just stop.)
export const STATIONS = {
  // Milano hubs (trains start here)
  'milano-centrale': { name: 'Milano Centrale', code: 'S01700' },
  'milano-pgaribaldi': { name: 'Milano P.Garibaldi', code: 'S01645' },
  'milano-cadorna': { name: 'Milano Cadorna', code: 'S01608' },
  'milano-pgenova': { name: 'Milano P.Genova', code: 'S01646' },
  'milano-bovisa': { name: 'Milano Bovisa', code: 'S01606' },

  // Malpensa
  'malpensa-t1': { name: 'Malpensa Aeroporto T1', code: 'S00865' },
  'malpensa-t2': { name: 'Malpensa Aeroporto T2', code: 'S00866' },

  // Major southbound origins
  'pavia': { name: 'Pavia', code: 'S01632' },
  'voghera': { name: 'Voghera', code: 'S01698' },
  'mortara': { name: 'Mortara', code: 'S01636' },

  // Major northbound
  'gallarate': { name: 'Gallarate', code: 'S01018' },
  'saronno': { name: 'Saronno', code: 'S01685' },
};

export const STATION_LIST = Object.entries(STATIONS).map(([slug, s]) => ({ slug, ...s }));
