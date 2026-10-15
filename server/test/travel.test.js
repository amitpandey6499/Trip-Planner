import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, haversineKm, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { setGeoFetch, setGeoInterval } = await import('../src/services/geo/geoHttp.js');
const { GeoCache } = await import('../src/models/index.js');

/** Part 11 — weather (fake Open-Meteo), how to reach (fake OSRM / Nominatim), trip fields. */
let calls = [];
let weatherDown = false;
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const dates = (start, end) => {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
};

const fakeFetch = async (url) => {
  const u = new URL(url);
  calls.push({ host: u.host, path: u.pathname, start: u.searchParams.get('start_date'), end: u.searchParams.get('end_date'), q: u.searchParams.get('q') });
  if (u.host.endsWith('open-meteo.test')) {
    if (weatherDown) throw new TypeError('fetch failed');
    const time = dates(u.searchParams.get('start_date'), u.searchParams.get('end_date'));
    const year = Number(time[0].slice(0, 4));
    const archive = u.pathname.endsWith('/archive');
    // archive: each year a bit warmer, one of three years rainy
    const tMax = archive ? 20 + (year % 3) * 2 : 18;
    return json({
      daily: {
        time,
        weather_code: time.map((_, i) => (archive ? (year % 3 === 0 ? 63 : 1) : i === 1 ? 61 : 0)),
        temperature_2m_max: time.map(() => tMax),
        temperature_2m_min: time.map(() => (archive ? 6 : 4)),
        precipitation_sum: time.map(() => (archive && year % 3 === 0 ? 5 : 0)),
        ...(!archive && { precipitation_probability_max: time.map((_, i) => (i === 1 ? 80 : 10)) }),
      },
    });
  }
  if (u.host === 'nominatim.test') {
    const q = (u.searchParams.get('q') || '').toLowerCase();
    if (q.startsWith('meerut')) return json([{ lat: '28.9845', lon: '77.7064', display_name: 'Meerut' }]);
    return json([]);
  }
  if (u.host === 'osrm.test') {
    // A road 1.3× the straight line, driven at 50 km/h — close enough to real Indian roads for these checks.
    const pts = u.pathname.split('/').pop().split(';').map((p) => p.split(',').map(Number));
    const [[lng1, lat1], [lng2, lat2]] = pts;
    const meters = Math.round(haversineKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }) * 1.3 * 1000);
    const seconds = Math.round(meters / (50 / 3.6));
    return json({ code: 'Ok', routes: [{ distance: meters, duration: seconds, legs: [{ distance: meters, duration: seconds }], geometry: { coordinates: pts } }] });
  }
  throw new Error(`unexpected ${url}`);
};

before(async () => {
  await startTestDb();
  setGeoFetch(fakeFetch);
  setGeoInterval(0);
});
after(async () => {
  setGeoFetch(null);
  setGeoInterval(null);
  await stopTestDb();
});
beforeEach(async () => {
  calls = [];
  weatherDown = false;
  await GeoCache.deleteMany({});
});

const weather = (query) => request(app).get('/api/travel/weather').query(query);

test('weather in the next days: real forecast with rain chance, attribution, cached', async () => {
  const start = addDays(todayIso(), 2);
  const res = await weather({ destination: 'Manali', start, end: addDays(start, 2) }).expect(200);
  const { days, location, attribution } = res.body.data;
  assert.equal(location.name, 'Manali');
  assert.equal(days.length, 3);
  assert.ok(days.every((d) => d.kind === 'forecast'));
  assert.equal(days[1].summary, 'Rain');
  assert.equal(days[1].rainChance, 80);
  assert.equal(attribution.text, 'Weather data by Open-Meteo.com');
  assert.equal(calls.length, 1);
  await weather({ destination: 'Manali', start, end: addDays(start, 2) }).expect(200);
  assert.equal(calls.length, 1, 'served from the cache');
});

test('weather far ahead: typical weather from the same dates in the last 3 years', async () => {
  const start = addDays(todayIso(), 60);
  const res = await weather({ destination: 'Jaipur', start, end: addDays(start, 1) }).expect(200);
  const day = res.body.data.days[0];
  assert.equal(day.kind, 'typical');
  assert.equal(day.years, 3);
  assert.equal(day.tMax, 22, 'average of 20, 22 and 24');
  assert.equal(day.rainyYears, 1);
  assert.equal(day.rainChance, 33);
  const archiveYears = calls.filter((c) => c.path.endsWith('/archive')).map((c) => Number(c.start.slice(0, 4)));
  assert.equal(archiveYears.length, 3);
  assert.ok(archiveYears.every((y) => `${y}${start.slice(4)}` < todayIso()), 'only dates that are already history');
  assert.match(res.body.data.notes.join(' '), /typical weather/);
});

test('a trip across the forecast limit mixes forecast and typical days', async () => {
  const start = addDays(todayIso(), 14);
  const res = await weather({ destination: 'Goa', start, end: addDays(start, 3) }).expect(200);
  assert.deepEqual(res.body.data.days.map((d) => d.kind), ['forecast', 'forecast', 'typical', 'typical']);
});

test('weather: given position, unknown place, service down, bad dates', async () => {
  const start = addDays(todayIso(), 1);
  const given = await weather({ destination: 'Kasol', start, end: start, lat: 32.01, lng: 77.31 }).expect(200);
  assert.equal(given.body.data.location.source, 'given');
  const unknown = await weather({ destination: 'Atlantis', start, end: start }).expect(404);
  assert.match(unknown.body.error, /could not find "Atlantis"/);
  weatherDown = true;
  const down = await weather({ destination: 'Goa', start, end: start }).expect(503);
  assert.match(down.body.error, /weather service could not be reached/);
  await weather({ destination: 'Goa', start, end: addDays(start, -2) }).expect(400);
});

const reach = (query) => request(app).get('/api/travel/reach').query(query);

test('how to reach Manali from Ghaziabad: flight, train, bus, car with real search links', async () => {
  const date = addDays(todayIso(), 20);
  const res = await reach({ from: 'Ghaziabad', to: 'manali', date }).expect(200);
  const { options, road, from } = res.body.data;
  assert.equal(from.station, 'GZB');
  assert.equal(road.source, 'osrm');
  assert.ok(road.km > 450 && road.km < 650, `road km ${road.km}`);
  const byMode = Object.fromEntries(options.map((o) => [o.mode, o]));
  assert.deepEqual(Object.keys(byMode), ['flight', 'train', 'bus', 'car']);
  assert.equal(byMode.flight.title, 'Fly DEL → KUU');
  assert.match(decodeURIComponent(byMode.flight.links[0].url), new RegExp(`Flights from DEL to KUU on ${date}`));
  assert.equal(byMode.train.title, 'Train GZB → CDG');
  assert.equal(byMode.bus.links[0].url, 'https://www.redbus.in/bus-tickets/ghaziabad-to-manali');
  assert.match(byMode.car.links[0].url, /google\.com\/maps\/dir\/\?api=1/);
  assert.equal(options.filter((o) => o.recommended).length, 1);
  assert.equal(byMode.bus.recommended, true, '~420 km and the railhead is far: overnight bus');
  assert.ok(options.every((o) => o.durationMin > 0));
  assert.deepEqual(byMode.bus.steps, [`About ${Math.round(road.km)} km by road.`], 'only facts about this route');
  assert.ok(res.body.data.notes.some((n) => n.startsWith('By road: Overnight Volvo buses from Delhi')), 'general road facts go to the notes');
});

test('how to reach: far away → flight; islands → flight or ship; same city; typed city via the map', async () => {
  const leh = await reach({ from: 'Bengaluru', to: 'Leh' }).expect(200);
  assert.equal(leh.body.data.options.find((o) => o.recommended).mode, 'flight');
  const lehFromDelhi = await reach({ from: 'Delhi', to: 'leh-ladakh' }).expect(200);
  assert.equal(lehFromDelhi.body.data.options.find((o) => o.recommended).mode, 'flight', 'more than 14 h by road → fly');

  const andaman = await reach({ from: 'Delhi', to: 'andaman' }).expect(200);
  assert.deepEqual(andaman.body.data.options.map((o) => o.mode), ['flight', 'ship']);

  const home = await reach({ from: 'Jaipur', to: 'jaipur' }).expect(200);
  assert.equal(home.body.data.options[0].mode, 'local');

  const meerut = await reach({ from: 'Meerut', to: 'rishikesh' }).expect(200);
  assert.equal(meerut.body.data.from.known, false);
  assert.ok(meerut.body.data.options.every((o) => ['bus', 'car'].includes(o.mode)), 'no airport / station known for a typed city');

  const unknown = await reach({ from: 'Xyzpur', to: 'goa' }).expect(404);
  assert.match(unknown.body.error, /Pick a city from the list/);
  await reach({ from: 'Delhi', to: 'Atlantis' }).expect(404);
});

test('trip keeps the starting city and the packing ticks', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Packer', email: 'packer@example.com', password: 'secret123' }).expect(201);
  const gen = await agent.post('/api/trips/generate').send({ destination: 'Goa', startDate: addDays(todayIso(), 10), durationDays: 3, totalBudget: 20000 }).expect(200);
  const saved = await agent.post('/api/trips').send({ tripData: { ...gen.body.preferences, title: gen.body.data.title }, itinerary: gen.body.data }).expect(201);
  const id = saved.body.data.id;
  await agent.put(`/api/trips/${id}`).send({ originCity: 'Ghaziabad', packingChecked: ['swimwear', 'sleepwear'] }).expect(200);
  const loaded = await agent.get(`/api/trips/${id}`).expect(200);
  assert.equal(loaded.body.data.preferences.originCity, 'Ghaziabad');
  assert.deepEqual(loaded.body.data.packingChecked, ['swimwear', 'sleepwear']);
  assert.equal(loaded.body.data.itinerary.days.length, 3, 'itinerary untouched');
});
