import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { DESTINATION_CATEGORIES, addDays, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { setGeoFetch, setGeoInterval } = await import('../src/services/geo/geoHttp.js');
const { refreshDestinationPhotos } = await import('../src/services/photoService.js');
const { findDestinationDoc } = await import('../src/services/destinationService.js');
const { Destination } = await import('../src/models/index.js');

/** Part 10 — destinations, photos (fake Wikipedia), stays, restaurants, favourites. */
let wikiCalls = [];
let wikiMode = 'ok'; // 'ok' | 'down'
const fakeFetch = async (url, options) => {
  const u = new URL(url);
  wikiCalls.push({ title: u.searchParams.get('titles'), ua: options?.headers?.['User-Agent'] });
  if (wikiMode === 'down') throw new TypeError('fetch failed');
  const title = u.searchParams.get('titles');
  const page =
    title === 'Ziro'
      ? { title, missing: true }
      : {
          title,
          fullurl: `https://en.wikipedia.org/wiki/${title.replace(/ /g, '_')}`,
          pageimage: `${title.replace(/\W+/g, '_')}.jpg`,
          thumbnail: { source: `https://upload.wikimedia.org/thumb/${encodeURIComponent(title)}.jpg`, width: 1280, height: 853 },
        };
  return { ok: true, status: 200, json: async () => ({ query: { pages: [page] } }) };
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

test('catalog: 26 destinations, every Explore category has some, no made-up ratings', async () => {
  const res = await request(app).get('/api/destinations').expect(200);
  assert.equal(res.body.count, 26);
  for (const category of DESTINATION_CATEGORIES.filter((c) => c !== 'All')) {
    const list = await request(app).get('/api/destinations').query({ category }).expect(200);
    assert.ok(list.body.count > 0, `${category} is empty`);
    assert.ok(list.body.data.every((d) => d.categories.includes(category)));
  }
  const first = res.body.data[0];
  assert.equal(first.slug, 'manali');
  assert.equal(first.rating, undefined);
  assert.equal(first.offlinePlanner, true);
  assert.equal(res.body.data.find((d) => d.slug === 'spiti').offlinePlanner, false);
});

test('search, sort by budget and by season', async () => {
  const forts = await request(app).get('/api/destinations').query({ q: 'fort' }).expect(200);
  const names = forts.body.data.map((d) => d.name);
  assert.ok(names.includes('Jaipur') && names.includes('Agra'), names.join(', '));

  const cheap = await request(app).get('/api/destinations').query({ sort: 'budget' }).expect(200);
  const budgets = cheap.body.data.map((d) => d.dailyBudget.Moderate);
  assert.deepEqual(budgets, [...budgets].sort((a, b) => a - b));

  const july = await request(app).get('/api/destinations').query({ sort: 'season', month: 7 }).expect(200);
  const firstOff = july.body.data.findIndex((d) => !d.inSeason);
  assert.ok(firstOff > 0 && july.body.data.slice(firstOff).every((d) => !d.inSeason), 'in-season destinations first');
  assert.ok(july.body.data[0].bestMonths.includes(7));
});

test('detail: offline destinations use the planner’s stays and eateries; others have their own; 404 for unknown', async () => {
  const manali = await request(app).get('/api/destinations/manali').expect(200);
  assert.equal(manali.body.data.stays[0].area, 'Mall Road / Old Manali');
  assert.ok(manali.body.data.eateries.length >= 3);
  assert.equal(manali.body.data.reach.airport.code, 'KUU');

  const leh = await request(app).get('/api/destinations/leh-ladakh').expect(200);
  assert.equal(leh.body.data.reach.airport.code, 'IXL');
  assert.match(leh.body.data.notes.join(' '), /altitude/);
  await request(app).get('/api/destinations/atlantis').expect(404);
  const legacy = await request(app).get('/api/places/search').query({ q: 'goa' }).expect(200);
  assert.ok(legacy.body.data.some((d) => d.slug === 'goa'));
});

test('names travellers type find the right destination', async () => {
  const cases = { Panjim: 'goa', Leh: 'leh-ladakh', Coorg: 'coorg', Kodagu: 'coorg', Dharamshala: 'mcleodganj', Cherrapunji: 'shillong', Pondicherry: 'puducherry', Mysore: 'mysuru', Munnar: 'kerala', 'Manali, Himachal Pradesh': 'manali' };
  for (const [typed, slug] of Object.entries(cases)) assert.equal((await findDestinationDoc(typed))?.slug, slug, typed);
  assert.equal(await findDestinationDoc('Atlantis'), null);
});

test('stays: areas with typical prices per tier, real search links with the dates, no invented hotels', async () => {
  const checkIn = addDays(todayIso(), 20);
  const checkOut = addDays(todayIso(), 23);
  const res = await request(app).get('/api/recommendations/hotels').query({ destination: 'Manali', budget: 'Budget', checkIn, checkOut, travelers: 3 }).expect(200);
  assert.ok(res.body.data.length >= 1);
  for (const stay of res.body.data) {
    assert.equal(stay.budgetTier, 'Budget');
    assert.equal(stay.kind, 'area');
    assert.equal(stay.rating, undefined);
    assert.match(stay.priceNote, /estimate/);
    const booking = new URL(stay.links.booking);
    assert.equal(booking.hostname, 'www.booking.com');
    assert.equal(booking.searchParams.get('checkin'), checkIn);
    assert.equal(booking.searchParams.get('group_adults'), '3');
    assert.equal(booking.searchParams.get('no_rooms'), '2');
  }
  const all = await request(app).get('/api/recommendations/hotels').query({ destination: 'Kerala' }).expect(200);
  assert.equal(all.body.data.length, 6, '2 areas × 3 tiers');
  const unknown = await request(app).get('/api/recommendations/hotels').query({ destination: 'Atlantis' }).expect(404);
  assert.match(unknown.body.error, /do not have stay/);
  await request(app).get('/api/recommendations/hotels').expect(400);
});

test('restaurants: veg filter; destinations without a list say so', async () => {
  const veg = await request(app).get('/api/recommendations/restaurants').query({ destination: 'Amritsar', veg: 1 }).expect(200);
  assert.ok(veg.body.data.length >= 3);
  assert.ok(veg.body.data.every((r) => r.veg));
  assert.ok(veg.body.data.some((r) => r.priceNote === 'Free'), 'Golden Temple langar');
  const ziro = await request(app).get('/api/recommendations/restaurants').query({ destination: 'Ziro' }).expect(200);
  assert.equal(ziro.body.data.length, 0);
  assert.match(ziro.body.note, /homestays/);
});

test('favourites: login needed, saved on the account, no duplicates, newest first', async () => {
  await request(app).get('/api/favorites').expect(401);
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Fav User', email: 'fav@example.com', password: 'secret123' }).expect(201);
  await agent.put('/api/favorites/spiti').expect(200);
  await agent.put('/api/favorites/manali').expect(200);
  const again = await agent.put('/api/favorites/spiti').expect(200);
  assert.deepEqual(again.body.data, ['spiti', 'manali']);
  await agent.put('/api/favorites/atlantis').expect(404);
  const list = await agent.get('/api/favorites').expect(200);
  assert.deepEqual(list.body.destinations.map((d) => d.name), ['Spiti Valley', 'Manali']);
  const me = await agent.get('/api/auth/me').expect(200);
  assert.deepEqual(me.body.data.favorites, ['spiti', 'manali']);
  const removed = await agent.delete('/api/favorites/spiti').expect(200);
  assert.deepEqual(removed.body.data, ['manali']);
});

test('photos: Wikipedia lead images are cached on the destination with links to the file page', async () => {
  wikiMode = 'ok';
  wikiCalls = [];
  const stats = await refreshDestinationPhotos();
  assert.equal(stats.updated, 25);
  assert.equal(stats.missing, 1, 'Ziro has no image in this fake Wikipedia');
  assert.match(wikiCalls[0].ua, /^TripPlanner\//);

  const leh = await request(app).get('/api/destinations/leh-ladakh').expect(200);
  assert.match(leh.body.data.image, /upload\.wikimedia\.org/);
  assert.equal(leh.body.data.imageCredit.source, 'Wikipedia');
  assert.match(leh.body.data.imageCredit.fileUrl, /wiki\/File:/);
  const ziro = await request(app).get('/api/destinations/ziro').expect(200);
  assert.equal(ziro.body.data.image, null, 'no fake photo');

  wikiCalls = [];
  await refreshDestinationPhotos();
  assert.equal(wikiCalls.length, 0, 'fresh photos and recent misses are not asked again');

  // Wikipedia down: stops at the first failure, keeps the photos it had
  wikiMode = 'down';
  await Destination.updateMany({}, { $set: { photo: null } });
  const down = await refreshDestinationPhotos({ force: true });
  assert.equal(down.failed, 1);
  assert.equal(wikiCalls.length, 1);
});

test('itineraries use the destination photo when there is one', async () => {
  wikiMode = 'ok';
  await refreshDestinationPhotos({ force: true });
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Photo User', email: 'photo@example.com', password: 'secret123' }).expect(201);
  const res = await agent.post('/api/trips/generate').send({ destination: 'Jaipur', startDate: addDays(todayIso(), 9), durationDays: 2, totalBudget: 9000 }).expect(200);
  assert.match(res.body.data.destinationImage, /upload\.wikimedia\.org\/thumb\/Jaipur/);
});
