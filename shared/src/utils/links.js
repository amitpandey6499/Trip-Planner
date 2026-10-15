/**
 * Links to outside sites (Parts 10 + 11). The app never books anything itself: it opens a search on the
 * site that does, already filled in. All URLs below use the sites' public, documented URL formats.
 */
const enc = encodeURIComponent;

/** "Spiti Valley" → "spiti-valley" */
export const slugify = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Booking.com hotel search for an area, optionally with dates and guests. */
export const bookingSearchUrl = ({ place, checkIn, checkOut, adults = 2 }) => {
  const params = new URLSearchParams({ ss: place });
  if (checkIn && checkOut) {
    params.set('checkin', checkIn);
    params.set('checkout', checkOut);
  }
  params.set('group_adults', String(adults));
  params.set('no_rooms', String(Math.max(1, Math.ceil(adults / 2))));
  return `https://www.booking.com/searchresults.html?${params}`;
};

/** Google Maps search (Maps URLs API). */
export const mapsSearchUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${enc(query)}`;

/** Google Maps directions (Maps URLs API). mode: driving | transit | walking */
export const mapsDirectionsUrl = (origin, destination, mode = 'driving') =>
  `https://www.google.com/maps/dir/?api=1&origin=${enc(origin)}&destination=${enc(destination)}&travelmode=${mode}`;

/** Google Flights search, e.g. "Flights from DEL to KUU on 2026-10-22". */
export const googleFlightsUrl = ({ from, to, date }) =>
  `https://www.google.com/travel/flights?q=${enc(`Flights from ${from} to ${to}${date ? ` on ${date}` : ''}`)}`;

/** redBus route page, e.g. https://www.redbus.in/bus-tickets/delhi-to-manali */
export const redBusUrl = (from, to) => `https://www.redbus.in/bus-tickets/${slugify(from)}-to-${slugify(to)}`;

/** IRCTC train search (the stations are typed there; we show the station codes next to the link). */
export const IRCTC_SEARCH_URL = 'https://www.irctc.co.in/nget/train-search';
