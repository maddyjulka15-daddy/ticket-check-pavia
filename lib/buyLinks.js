// Buy links use each operator's working landing page (homepage or tickets page).
// We can't deep-link the route because none of these sites publicly document a
// URL format with from/to/date params — they all rely on internal station IDs.
// User types the route once they land, but the links never 404.

export function getBuyLinks(fromSlug, toSlug, fromName, toName) {
  return [
    {
      label: 'Trenord',
      sub: 'Regionali Lombardia · biglietti ufficiali',
      url: 'https://www.trenord.it/biglietti/',
      kind: 'official',
    },
    {
      label: 'Trenitalia',
      sub: 'Regionali, IC, Frecce · sito ufficiale',
      url: 'https://www.trenitalia.com/it.html',
      kind: 'official',
    },
    {
      label: 'Omio',
      sub: 'Confronto prezzi treni e bus',
      url: 'https://www.omio.com/',
      kind: 'aggregator',
    },
    {
      label: 'Trainline',
      sub: 'App popolare in UE, pagamento facile',
      url: 'https://www.thetrainline.com/',
      kind: 'aggregator',
    },
  ];
}
