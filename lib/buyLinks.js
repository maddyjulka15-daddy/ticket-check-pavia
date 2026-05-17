// Buy links for a given route.
// - Trenitalia (lefrecce.it): pre-fills route + date via undocumented hash URL.
// - Trainline: passes names + date; pre-fill behaviour depends on whether their
//   site can resolve the name to a station ID. Falls back to a usable search page.
// - Trenord and Omio: no public name-based deep-link format, so we open their
//   tickets/landing page and the user types the route once they land.

function pad(n) {
  return String(n).padStart(2, '0');
}

export function getBuyLinks(fromSlug, toSlug, fromName, toName) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const isoDate = `${yyyy}-${mm}-${dd}`;
  const ddmmyyyy = `${dd}-${mm}-${yyyy}`;

  const from = encodeURIComponent(fromName || '');
  const to = encodeURIComponent(toName || '');

  const lefrecce = `https://www.lefrecce.it/msite/?lang=it#search?departureStation=${from}&arrivalStation=${to}&departureDate=${ddmmyyyy}&departureTime=${hh}&noOfAdults=1&noOfChildren=0&tripType=off&selectedTrainType=tutti&ynFlexibleDates=off`;

  const trainline = `https://www.thetrainline.com/book/results?origin=${from}&destination=${to}&outwardDate=${isoDate}`;

  return [
    {
      label: 'Trenitalia',
      sub: 'Regionali, IC, Frecce · route pre-filled',
      url: lefrecce,
      kind: 'official',
    },
    {
      label: 'Trenord',
      sub: 'Regionali Lombardia · cerca dalla home',
      url: 'https://www.trenord.it/biglietti/',
      kind: 'official',
    },
    {
      label: 'Trainline',
      sub: 'App popolare in UE',
      url: trainline,
      kind: 'aggregator',
    },
    {
      label: 'Omio',
      sub: 'Confronto prezzi · cerca dalla home',
      url: 'https://www.omio.com/',
      kind: 'aggregator',
    },
  ];
}
