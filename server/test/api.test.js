import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { ContactMessage } = await import('../src/models/index.js');

// Always use dates relative to today, so the tests never expire.
const future = (days) => addDays(todayIso(), days);
const tripData = (overrides = {}) => ({
  destination: 'Goa',
  title: 'Beach week',
  startDate: future(5),
  endDate: future(7),
  travelersCount: 2,
  totalBudget: 9000,
  ...overrides,
});

let alice; // supertest agents keep the login cookie
let bob;

before(async () => {
  await startTestDb();
  alice = request.agent(app);
  bob = request.agent(app);
  await alice.post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' }).expect(201);
  await bob.post('/api/auth/register').send({ name: 'Bob', email: 'bob@example.com', password: 'secret123' }).expect(201);
});
after(stopTestDb);

test('GET /api/health reports real status and the correct college', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.database.type, 'MongoDB');
  assert.equal(res.body.database.connected, true);
  assert.equal(res.body.services.geminiAI, false, 'no key in tests, so AI must show as not configured');
  assert.equal(res.body.services.offlineDestinations.length, 8);
  assert.ok(res.body.services.offlineDestinations.includes('Manali'));
  assert.match(res.body.college, /ABES Engineering College/);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('unknown endpoint returns JSON 404', async () => {
  const res = await request(app).get('/api/does-not-exist').expect(404);
  assert.match(res.body.error, /Cannot find endpoint/);
});

test('malformed JSON returns 400 (not 200)', async () => {
  await alice.post('/api/trips/generate').set('Content-Type', 'application/json').send('{bad json').expect(400);
});

test('trip endpoints need login', async () => {
  for (const [method, url] of [['get', '/api/trips'], ['post', '/api/trips'], ['post', '/api/trips/generate'], ['get', '/api/trips/abc']]) {
    const res = await request(app)[method](url).send({}).expect(401);
    assert.equal(res.body.error, 'Please log in to continue.');
  }
});

test('generate: validation with the shared messages', async () => {
  assert.equal((await alice.post('/api/trips/generate').send({}).expect(400)).body.details.field, 'destination');
  const budget = await alice.post('/api/trips/generate').send({ destination: 'Goa', startDate: future(10), totalBudget: 'abc' }).expect(400);
  assert.equal(budget.body.error, 'Budget must be a number.');
  const dates = await alice.post('/api/trips/generate').send({ destination: 'Goa', startDate: future(10), endDate: future(5), totalBudget: 9000 }).expect(400);
  assert.equal(dates.body.error, 'End date cannot be before start date.');
});

test('generate: dated days, budget that adds up, unknown fields dropped', async () => {
  const res = await alice
    .post('/api/trips/generate')
    .send({ destination: 'Manali', startDate: future(20), endDate: future(23), totalBudget: 15000, hack: true })
    .expect(200);
  assert.equal(res.body.preferences.durationDays, 4);
  assert.equal(res.body.preferences.hack, undefined);
  assert.equal(res.body.data.days[3].date, future(23));
  const b = res.body.data.budgetBreakdown;
  assert.equal(b.totalEstimated, b.accommodation + b.activitiesAndSightseeing + b.foodAndDining + b.localTransport);
});

test('save → list → get → update → delete (own trip)', async () => {
  const saved = await alice
    .post('/api/trips')
    .send({ tripData: tripData(), preferences: { interests: ['Beaches'], travelStyle: 'Relaxed' } })
    .expect(201);
  const trip = saved.body.data;
  assert.match(trip.id, /^[a-f0-9]{24}$/);
  assert.equal(trip.durationDays, 3);
  assert.equal(trip.userId.length, 24);
  assert.deepEqual(trip.preferences.interests, ['Beaches'], 'preferences are kept for Edit');

  const list = await alice.get('/api/trips').expect(200);
  assert.ok(list.body.data.some((t) => t.id === trip.id));

  const updated = await alice.put(`/api/trips/${trip.id}`).send({ title: 'Goa with friends', userId: 'hacker', owner: 'x' }).expect(200);
  assert.equal(updated.body.data.title, 'Goa with friends');
  assert.equal(updated.body.data.userId, trip.userId, 'owner must not change through PUT');

  const moved = await alice.put(`/api/trips/${trip.id}`).send({ startDate: future(8), endDate: future(10) }).expect(200);
  assert.equal(moved.body.data.durationDays, 3);
  await alice.put(`/api/trips/${trip.id}`).send({ endDate: future(1) }).expect(400);
  await alice.put(`/api/trips/${trip.id}`).send({ travelersCount: 'many' }).expect(400);

  await alice.delete(`/api/trips/${trip.id}`).expect(200);
  await alice.get(`/api/trips/${trip.id}`).expect(404);
});

test('save twice with the id updates the same trip (no duplicate)', async () => {
  const first = await alice.post('/api/trips').send({ tripData: tripData({ title: 'Once' }) }).expect(201);
  const again = await alice.post('/api/trips').send({ tripData: tripData({ id: first.body.data.id, title: 'Twice' }) }).expect(200);
  assert.equal(again.body.data.id, first.body.data.id);
  assert.equal(again.body.data.title, 'Twice');
  const list = await alice.get('/api/trips').expect(200);
  assert.equal(list.body.data.filter((t) => t.id === first.body.data.id).length, 1);
});

test('one user can never see, change or delete another user\'s trip', async () => {
  const { body } = await alice.post('/api/trips').send({ tripData: tripData({ title: 'Alice private' }) }).expect(201);
  const id = body.data.id;

  const bobList = await bob.get('/api/trips').expect(200);
  assert.ok(bobList.body.data.every((t) => t.id !== id));
  await bob.get(`/api/trips/${id}`).expect(404);
  await bob.put(`/api/trips/${id}`).send({ title: 'hacked' }).expect(404);
  await bob.delete(`/api/trips/${id}`).expect(404);
  await bob.post('/api/trips').send({ tripData: tripData({ id, title: 'hijack' }) }).expect(404);

  const stillThere = await alice.get(`/api/trips/${id}`).expect(200);
  assert.equal(stillThere.body.data.title, 'Alice private');
});

test('invalid trip id is a 404, not a server error', async () => {
  await alice.get('/api/trips/not-an-id').expect(404);
  await alice.delete('/api/trips/123').expect(404);
});

test('save: a broken itinerary is rejected with a clear message', async () => {
  const res = await alice.post('/api/trips').send({ tripData: tripData(), itinerary: { title: 'Goa', days: [] } }).expect(400);
  assert.match(res.body.error, /at least one day/);
});

test('save: what you save is what you get back (normalized itinerary)', async () => {
  const gen = await alice.post('/api/trips/generate').send({ destination: 'Jaipur', startDate: future(12), durationDays: 2, totalBudget: 10000 }).expect(200);
  const { preferences, data } = gen.body;
  const saved = await alice.post('/api/trips').send({ tripData: { ...preferences, title: data.title }, itinerary: data }).expect(201);
  const loaded = await alice.get(`/api/trips/${saved.body.data.id}`).expect(200);
  assert.deepEqual(loaded.body.data.itinerary, data);
});

test('changing the number of days of a trip with an itinerary asks for Regenerate', async () => {
  const gen = await alice.post('/api/trips/generate').send({ destination: 'Goa', startDate: future(15), durationDays: 2, totalBudget: 9000 }).expect(200);
  const saved = await alice.post('/api/trips').send({ tripData: gen.body.preferences, itinerary: gen.body.data }).expect(201);
  const res = await alice.put(`/api/trips/${saved.body.data.id}`).send({ endDate: future(20) }).expect(400);
  assert.match(res.body.error, /Regenerate/);
  const shifted = await alice.put(`/api/trips/${saved.body.data.id}`).send({ startDate: future(30), endDate: future(31) }).expect(200);
  assert.equal(shifted.body.data.itinerary.days[0].date, future(30), 'itinerary days move with the dates');
  const renamed = await alice.put(`/api/trips/${saved.body.data.id}`).send({ title: 'Beach weekend' }).expect(200);
  assert.equal(renamed.body.data.itinerary.title, 'Beach weekend', 'rename also changes the itinerary page title');
  await alice.put(`/api/trips/${saved.body.data.id}`).send({ title: '   ' }).expect(400);
});

test('contact form: saved to the database, validated with shared rules', async () => {
  await request(app).post('/api/contact').send({ name: 'Guest', email: 'guest@example.com', message: 'Loved the project demo!' }).expect(201);
  const bad = await request(app).post('/api/contact').send({ name: 'G', email: 'x', message: 'hi' }).expect(400);
  assert.equal(bad.body.details.fields.message, 'Message must be at least 10 characters.');
  const stored = await ContactMessage.findOne({ email: 'guest@example.com' }).lean();
  assert.equal(stored.status, 'new');
});
