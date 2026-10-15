import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, mapStops, needsMapUpdate, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { setGeoFetch, setGeoInterval, USER_AGENT } = await import('../src/services/geo/geoHttp.js');
const { placeQuery } = await import('../src/services/geo/geocoder.js');
const { simplifyLine } = await import('../src/services/geo/router.js');
const { GeoCache } = await import('../src/models/index.js');

/**
 * Part 8 — the map services are FAKE here (no internet): we decide what "Nominatim" and "OSRM"
 * answer, count the calls and check the requests follow the usage policies.
 */
let calls = [];
let places = {}; // query (lower case, before the first comma) → [lat, lng] | null
let nominatimDown = false;
let osrmMode = 'ok'; // 'ok' | 'down' | 'noroute'

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const fakeFetch = async (url, options) => {
  const u = new URL(url);
  calls.push({ host: u.host, url, headers: options?.headers ?? {}, at: Date.now() });
  if (u.host === 'nominatim.test') {
    if (nominatimDown) throw new TypeError('fetch failed');
    const q = u.searchParams.get('q').split(',')[0].trim().toLowerCase();
    const hit = places[q];
    return json(hit ? [{ lat: String(hit[0]), lon: String(hit[1]), display_name: `${q}, India` }] : []);
  }
  if (u.host === 'osrm.test') {
    if (osrmMode === 'down') throw new TypeError('fetch failed');
    if (osrmMode === 'noroute') return json({ code: 'NoRoute', message: 'Impossible route' }, 400);
    const pts = u.pathname.split('/').pop().split(';').map((p) => p.split(',').map(Number)); // [lng, lat]
    // A wiggly road with many points between the stops.
    const line = [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      for (let k = 0; k < 300; k += 1) {
        const t = k / 300;
        line.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t + Math.sin(k) * 0.0005, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
      }
    }
    line.push(pts[pts.length - 1]);
    const legs = pts.slice(1).map(() => ({ distance: 5300, duration: 900 }));
    return json({ code: 'Ok', routes: [{ distance: 5300 * legs.length, duration: 900 * legs.length, legs, geometry: { type: 'LineString', coordinates: line } }] });
  }
  throw new Error(`unexpected URL ${url}`);
};

const future = (d) => addDays(todayIso(), d);
let agent;
let n = 0;

before(async () => {
  await startTestDb();
  setGeoFetch(fakeFetch);
  setGeoInterval(0);
});
after(async () => {
  setGeoFetch(null);
  setGeoInterval(1100);
  await stopTestDb();
});
beforeEach(async () => {
  calls = [];
  places = {};
  nominatimDown = false;
  osrmMode = 'ok';
  await GeoCache.deleteMany({});
  agent = request.agent(app);
  n += 1;
  await agent.post('/api/auth/register').send({ name: 'Map Tester', email: `map${n}@example.com`, password: 'secret123' }).expect(201);
});

const offlinePlan = async (destination = 'Manali', durationDays = 3) =>
  (await agent.post('/api/trips/generate').send({ destination, startDate: future(10), durationDays, totalBudget: 20000, travelersCount: 2 }).expect(200)).body;

/** An itinerary "written by Gemini": positions are guesses. */
const aiItinerary = () => ({
  source: 'gemini',
  destination: 'Jaipur',
  title: 'Jaipur',
  durationDays: 1,
  startDate: future(5),
  budgetBreakdown: {},
  days: [
    {
      title: 'Forts',
      activities: [
        { placeName: 'Arrive at Jaipur Junction & check in', category: 'Transit', timeSlot: '09:00 AM - 10:00 AM', coordinates: { lat: 26.92, lng: 75.79 } },
        { placeName: 'Visit Amber Fort (Amer)', category: 'Attraction', timeSlot: '10:30 AM - 01:00 PM', coordinates: { lat: 26.9, lng: 75.8 } },
        { placeName: "Lunch at Peacock Rooftop", category: 'Restaurant', timeSlot: '01:30 PM - 02:30 PM', coordinates: { lat: 26.91, lng: 75.81 } },
        { placeName: 'Secret Stepwell Nobody Knows', category: 'Attraction', timeSlot: '03:00 PM - 04:00 PM', coordinates: { lat: 26.95, lng: 75.85 } },
        { placeName: 'Imaginary Palace', category: 'Attraction', timeSlot: '05:00 PM - 06:00 PM', coordinates: { lat: 12.97, lng: 77.59 } }, // Bengaluru!
      ],
    },
  ],
  hotels: [{ name: 'Hotel Pearl Palace', pricePerNight: 3000 }],
  restaurants: [{ name: 'Peacock Rooftop', cuisine: 'Rajasthani', costForTwo: 1200 }],
});

/** Read a text/event-stream answer into [{ event, data }]. */
const sse = (req) =>
  req
    .set('Accept', 'text/event-stream')
    .buffer(true)
    .parse((res, done) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => done(null, text));
    })
    .then((res) => ({
      res,
      events: res.body
        .split('\n\n')
        .filter((block) => block.startsWith('event:'))
        .map((block) => {
          const [eventLine, dataLine] = block.split('\n');
          return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
        }),
    }));

test('placeQuery keeps the real place name and skips non-places', () => {
  assert.equal(placeQuery('Lunch at Peacock Rooftop'), 'Peacock Rooftop');
  assert.equal(placeQuery('Visit Amber Fort (Amer)'), 'Amber Fort');
  assert.equal(placeQuery('Hadimba Devi Temple & Mall Road'), 'Hadimba Devi Temple');
  assert.equal(placeQuery('Hotel Pearl Palace'), 'Hotel Pearl Palace');
  for (const generic of ['Check out & depart', 'Free time around Mall Road', 'Local travel for the day (cab / auto)', 'Lunch on the way (local dhaba / café)', 'Dinner: Local thali']) {
    assert.equal(placeQuery(generic), null, generic);
  }
});

test('simplifyLine keeps the ends and stays under the point limit', () => {
  const line = Array.from({ length: 5000 }, (_, i) => [26 + i / 5000, 75 + Math.sin(i / 50) / 100]);
  const simple = simplifyLine(line, 400);
  assert.ok(simple.length <= 400 && simple.length > 10, String(simple.length));
  assert.deepEqual(simple[0], [26, 75]);
  assert.deepEqual(simple.at(-1), line.at(-1).map((v) => Math.round(v * 1e5) / 1e5));
});

test('offline plan: curated positions are trusted (no lookups), every day gets a road route', async () => {
  const { data } = await offlinePlan('Manali', 3);
  assert.equal(needsMapUpdate(data), true, 'routes are not there yet');
  assert.ok(data.days[0].activities.every((a) => a.locationSource === 'curated'));

  const res = await agent.post('/api/map/enrich').send({ itinerary: data }).expect(200);
  const it = res.body.data;
  assert.equal(calls.filter((c) => c.host === 'nominatim.test').length, 0, 'curated data needs no geocoding');
  assert.equal(calls.filter((c) => c.host === 'osrm.test').length, 3, 'one route request per day');
  for (const day of it.days) {
    assert.equal(day.route.provider, 'osrm');
    assert.equal(day.route.legs.length, mapStops(day).length - 1);
    assert.ok(day.route.geometry.length <= 400);
    assert.deepEqual(day.route.stopIds, mapStops(day).map((s) => s.id));
  }
  assert.equal(it.map.version, 1);
  assert.equal(it.map.located, it.map.total);
  assert.equal(needsMapUpdate(it), false);
  assert.equal(calls[0].headers['User-Agent'], USER_AGENT);
  assert.match(USER_AGENT, /^TripPlanner\//, 'identifies the app (usage policy)');

  calls = [];
  const again = await agent.post('/api/map/enrich').send({ itinerary: it }).expect(200);
  assert.equal(calls.length, 0, 'nothing to do the second time');
  assert.deepEqual(again.body.data.days, it.days);
});

test('AI plan: places are looked up near the destination; misses keep a nearby guess or are dropped', async () => {
  places = { jaipur: [26.9124, 75.7873], 'amber fort': [26.9855, 75.8513], 'peacock rooftop': [26.9196, 75.8128], 'hotel pearl palace': [26.9149, 75.7996] };
  const res = await agent.post('/api/map/enrich').send({ itinerary: aiItinerary() }).expect(200);
  const [arrive, fort, lunch, stepwell, imaginary] = res.body.data.days[0].activities;

  assert.equal(arrive.locationSource, 'ai', 'travel steps are not looked up');
  assert.deepEqual(fort.coordinates, { lat: 26.9855, lng: 75.8513 });
  assert.equal(fort.locationSource, 'geocoded');
  assert.equal(lunch.locationSource, 'geocoded');
  assert.equal(stepwell.locationSource, 'ai', 'not found, but the AI guess is near Jaipur');
  assert.equal(imaginary.locationSource, 'none', 'AI guess in another state is dropped');
  assert.equal(imaginary.coordinates, undefined);
  assert.equal(res.body.data.restaurants[0].locationSource, 'geocoded');
  assert.equal(res.body.data.hotels[0].locationSource, 'geocoded');

  const queries = calls.filter((c) => c.host === 'nominatim.test').map((c) => new URL(c.url).searchParams.get('q'));
  assert.equal(queries.filter((q) => q.startsWith('Peacock Rooftop')).length, 1, '"Lunch at X" and restaurant X → one lookup');
  assert.ok(queries.includes('Amber Fort, Jaipur'));
  const fortCall = new URL(calls.find((c) => c.url.includes('Amber')).url);
  assert.equal(fortCall.searchParams.get('countrycodes'), 'in');
  assert.ok(fortCall.searchParams.get('viewbox'), 'results are biased towards the destination');
  assert.equal(res.body.data.days[0].route.provider, 'osrm');

  calls = [];
  await agent.post('/api/map/enrich').send({ itinerary: aiItinerary() }).expect(200);
  assert.equal(calls.filter((c) => c.host === 'nominatim.test').length, 0, 'answers (found and not found) are cached');
});

test('services down: honest estimates, places left for a later try', async () => {
  nominatimDown = true;
  osrmMode = 'down';
  const res = await agent.post('/api/map/enrich').send({ itinerary: aiItinerary() }).expect(200);
  const it = res.body.data;
  assert.equal(it.days[0].route.provider, 'estimate');
  assert.ok(it.days[0].route.distanceKm > 0);
  assert.match(it.map.notice, /could not be reached/);
  assert.equal(res.body.stats.serviceDown, true);
  assert.equal(needsMapUpdate(it), true, 'unlooked-up places are tried again later');
  assert.equal(calls.filter((c) => c.host === 'nominatim.test').length, 1, 'stops asking after the first failure');

  // Back up: the next update finishes the job; force=true replaces the estimated routes.
  nominatimDown = false;
  osrmMode = 'ok';
  places = { jaipur: [26.9124, 75.7873], 'amber fort': [26.9855, 75.8513] };
  const fixed = await agent.post('/api/map/enrich').send({ itinerary: it, force: true }).expect(200);
  assert.equal(fixed.body.data.days[0].route.provider, 'osrm');
  assert.equal(fixed.body.data.map.notice, undefined);
});

test('islands without a road between stops: estimate with an explanation', async () => {
  osrmMode = 'noroute';
  const { data } = await offlinePlan('Andaman', 3);
  const res = await agent.post('/api/map/enrich').send({ itinerary: data }).expect(200);
  assert.ok(res.body.data.days.every((d) => d.route.provider !== 'osrm'));
  assert.match(res.body.data.map.notice, /No road route/);
});

test('requests to a service are spaced out (max 1 per second in real use)', async () => {
  setGeoInterval(150);
  try {
    places = { jaipur: [26.9124, 75.7873] };
    await agent.post('/api/map/enrich').send({ itinerary: aiItinerary() }).expect(200);
    const geo = calls.filter((c) => c.host === 'nominatim.test');
    assert.ok(geo.length >= 3);
    for (let i = 1; i < geo.length; i += 1) assert.ok(geo[i].at - geo[i - 1].at >= 140, `gap ${geo[i].at - geo[i - 1].at} ms`);
  } finally {
    setGeoInterval(0);
  }
});

test('live progress as an event stream', async () => {
  places = { jaipur: [26.9124, 75.7873] };
  const { res, events } = await sse(agent.post('/api/map/enrich').send({ itinerary: aiItinerary() }));
  assert.match(res.headers['content-type'], /text\/event-stream/);
  const names = events.map((e) => e.event);
  assert.ok(names.filter((e) => e === 'progress').length >= 3);
  assert.equal(names.at(-1), 'result');
  assert.ok(events.some((e) => e.event === 'progress' && e.data.stage === 'places' && /Finding places/.test(e.data.message)));
  assert.equal(events.at(-1).data.data.days[0].route.provider, 'osrm');
});

test('saved trip: map is stored with the trip; only the owner can update it', async () => {
  const { data, preferences } = await offlinePlan('Jaipur', 2);
  const saved = await agent.post('/api/trips').send({ tripData: { ...preferences, title: data.title }, itinerary: data }).expect(201);
  const id = saved.body.data.id;

  const other = request.agent(app);
  await other.post('/api/auth/register').send({ name: 'Other', email: `other${n}@example.com`, password: 'secret123' }).expect(201);
  await other.post(`/api/trips/${id}/map`).expect(404);

  const res = await agent.post(`/api/trips/${id}/map`).expect(200);
  assert.equal(res.body.stale, false);
  const loaded = await agent.get(`/api/trips/${id}`).expect(200);
  assert.equal(loaded.body.data.itinerary.days[0].route.provider, 'osrm');
  assert.equal(needsMapUpdate(loaded.body.data.itinerary), false);
});

test('bad input is rejected before any work starts', async () => {
  await agent.post('/api/map/enrich').send({}).expect(400);
  const bad = await agent.post('/api/map/enrich').send({ itinerary: { destination: 'Goa', days: [{ title: 'x', activities: [] }] } }).expect(400);
  assert.match(bad.body.error, /at least one activity/);
  await request(app).post('/api/map/enrich').send({ itinerary: aiItinerary() }).expect(401);
});
