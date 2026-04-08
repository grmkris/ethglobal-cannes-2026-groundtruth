// Static country centroids for geocoding Polymarket tags to map coordinates.
// Keys are lowercase tag slugs, ISO-A2, ISO-A3, and common names — all
// normalized to lowercase in geocodeTag(). Values are [lat, lng].

const CENTROIDS: Record<string, [number, number]> = {
  // North America
  usa: [39.8, -98.6], "united-states": [39.8, -98.6], "us-elections": [39.8, -98.6], "us-politics": [39.8, -98.6], us: [39.8, -98.6],
  can: [56.1, -106.3], canada: [56.1, -106.3],
  mex: [23.6, -102.5], mexico: [23.6, -102.5],

  // Europe
  gbr: [54.0, -2.0], uk: [54.0, -2.0], "united-kingdom": [54.0, -2.0], britain: [54.0, -2.0],
  fra: [46.6, 2.2], france: [46.6, 2.2],
  deu: [51.2, 10.4], germany: [51.2, 10.4],
  ita: [41.9, 12.5], italy: [41.9, 12.5],
  esp: [40.5, -3.7], spain: [40.5, -3.7],
  pol: [51.9, 19.1], poland: [51.9, 19.1],
  rou: [45.9, 25.0], romania: [45.9, 25.0],
  nld: [52.1, 5.3], netherlands: [52.1, 5.3],
  bel: [50.8, 4.5], belgium: [50.8, 4.5],
  grc: [39.1, 21.8], greece: [39.1, 21.8],
  prt: [39.4, -8.2], portugal: [39.4, -8.2],
  swe: [60.1, 18.6], sweden: [60.1, 18.6],
  nor: [60.5, 8.5], norway: [60.5, 8.5],
  fin: [61.9, 25.7], finland: [61.9, 25.7],
  che: [46.8, 8.2], switzerland: [46.8, 8.2],
  aut: [47.5, 14.6], austria: [47.5, 14.6],

  // Eastern Europe / Former Soviet
  ukr: [48.4, 31.2], ukraine: [48.4, 31.2],
  rus: [61.5, 105.3], russia: [61.5, 105.3],
  blr: [53.7, 27.9], belarus: [53.7, 27.9],
  geo: [42.3, 43.4], georgia: [42.3, 43.4],

  // Middle East
  irn: [32.4, 53.7], iran: [32.4, 53.7],
  irq: [33.2, 43.7], iraq: [33.2, 43.7],
  isr: [31.0, 34.9], israel: [31.0, 34.9],
  pse: [31.9, 35.2], palestine: [31.9, 35.2], gaza: [31.5, 34.5],
  sau: [23.9, 45.1], "saudi-arabia": [23.9, 45.1],
  tur: [38.9, 35.2], turkey: [38.9, 35.2], turkiye: [38.9, 35.2],
  syr: [35.0, 38.0], syria: [35.0, 38.0],
  lbn: [33.9, 35.9], lebanon: [33.9, 35.9],
  yem: [15.6, 48.5], yemen: [15.6, 48.5],

  // Asia
  chn: [35.9, 104.2], china: [35.9, 104.2],
  ind: [20.6, 79.0], india: [20.6, 79.0],
  jpn: [36.2, 138.3], japan: [36.2, 138.3],
  kor: [35.9, 127.8], "south-korea": [35.9, 127.8],
  prk: [40.3, 127.5], "north-korea": [40.3, 127.5],
  twn: [23.7, 121.0], taiwan: [23.7, 121.0],
  pak: [30.4, 69.3], pakistan: [30.4, 69.3],
  mmr: [19.8, 96.0], myanmar: [19.8, 96.0],
  tha: [15.9, 100.9], thailand: [15.9, 100.9],
  vnm: [14.1, 108.3], vietnam: [14.1, 108.3],
  phl: [12.9, 121.8], philippines: [12.9, 121.8],
  idn: [-0.8, 113.9], indonesia: [-0.8, 113.9],
  afg: [33.9, 67.7], afghanistan: [33.9, 67.7],

  // Africa
  nga: [9.1, 8.7], nigeria: [9.1, 8.7],
  zaf: [-30.6, 22.9], "south-africa": [-30.6, 22.9],
  egy: [26.8, 30.8], egypt: [26.8, 30.8],
  eth: [9.1, 40.5], ethiopia: [9.1, 40.5],
  ken: [-0.0, 37.9], kenya: [-0.0, 37.9],
  sdn: [12.9, 30.2], sudan: [12.9, 30.2],

  // South America
  bra: [-14.2, -51.9], brazil: [-14.2, -51.9],
  arg: [-38.4, -63.6], argentina: [-38.4, -63.6],
  col: [4.6, -74.3], colombia: [4.6, -74.3],
  ven: [6.4, -66.6], venezuela: [6.4, -66.6],

  // Oceania
  aus: [-25.3, 133.8], australia: [-25.3, 133.8],
  nzl: [-40.9, 174.9], "new-zealand": [-40.9, 174.9],

  // Geopolitical tags (not countries)
  nato: [50.8, 4.4], eu: [50.1, 14.4], "european-union": [50.1, 14.4],
  "global-elections": [20.0, 0.0],
  "nuclear-weapons": [46.0, 2.0],
  geopolitics: [20.0, 0.0],
  world: [20.0, 0.0],
}

/**
 * Try to geocode a Polymarket tag slug to a [lat, lng] centroid.
 * Returns null if no match.
 */
export function geocodeTag(tag: string): [number, number] | null {
  return CENTROIDS[tag.toLowerCase().trim()] ?? null
}

/**
 * Try each tag in order, returning the first match.
 * Tags like "Ukraine" or "us-elections" resolve to country centroids.
 */
export function geocodeTags(
  tags: Array<{ slug?: string; label?: string }>
): [number, number] | null {
  for (const tag of tags) {
    const slug = tag.slug ?? tag.label
    if (!slug) continue
    const result = geocodeTag(slug)
    if (result) return result
  }
  return null
}
