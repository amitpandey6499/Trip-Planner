import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, todayIso } from '@tripplanner/shared';

const { default: app } = await import('../src/app.js');

// Always use dates relative to today, so the tests never expire.
const future = (days) => addDays(todayIso(), days);

test('GET /api/health reports real status and the correct college', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.services.geminiAI, false, 'no key in tests, so AI must show as not configured');
  assert.match(res.body.college, /ABES Engineering College/);
  assert.equal(res.headers['x-powered-by'], undefined, 'x-powered-by header should be hidden');
});

test('unknown endpoint returns JSON 404', async () => {
  const res = await request(app).get('/api/does-not-exist').expect(404);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /Cannot find endpoint/);
});

test('malformed JSON returns 400 (not 200)', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .set('Content-Type', 'application/json')
    .send('{bad json')
    .expect(400);
  assert.equal(res.body.success, false);
});

test('generate: destination is required', async () => {
  const res = await request(app).post('/api/trips/generate').send({}).expect(400);
  assert.equal(res.body.details.field, 'destination');
});

test('generate: garbage budget is rejected instead of becoming NaN', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Goa', startDate: future(10), totalBudget: 'abc' })
    .expect(400);
  assert.equal(res.body.details.field, 'totalBudget');
  assert.equal(res.body.error, 'Budget must be a number.');
});

test('generate: end date before start date is rejected', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Goa', startDate: future(10), endDate: future(5), totalBudget: 9000 })
    .expect(400);
  assert.equal(res.body.details.field, 'endDate');
  assert.equal(res.body.error, 'End date cannot be before start date.');
});

test('generate: dates decide the duration and endDate is returned', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Manali', startDate: future(20), endDate: future(23), totalBudget: 15000 })
    .expect(200);
  assert.equal(res.body.preferences.durationDays, 4);
  assert.equal(res.body.preferences.endDate, future(23));
  assert.equal(res.body.data.days.length, 4);
  assert.equal(res.body.data.days[3].date, future(23), 'days carry real dates');
});

test('generate: missing endDate is calculated from duration', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Goa', startDate: future(30), durationDays: 3, totalBudget: 12000 })
    .expect(200);
  assert.equal(res.body.preferences.endDate, future(32));
});

test('trips: save, list, update (only allowed fields), delete', async () => {
  const saved = await request(app)
    .post('/api/trips')
    .send({ tripData: { destination: 'Goa', title: 'Beach week', startDate: future(5), endDate: future(7), travelersCount: 2, totalBudget: 9000 } })
    .expect(201);
  assert.equal(saved.body.data.durationDays, 3, 'duration calculated from dates');
  const id = saved.body.data.id;

  const list = await request(app).get('/api/trips').expect(200);
  assert.ok(list.body.data.some((t) => t.id === id));

  const updated = await request(app)
    .put(`/api/trips/${id}`)
    .send({ title: 'Goa with friends', userId: 'hacker', id: 'other' })
    .expect(200);
  assert.equal(updated.body.data.title, 'Goa with friends');
  assert.equal(updated.body.data.userId, 'user_demo_123', 'owner must not change through PUT');
  assert.equal(updated.body.data.id, id, 'id must not change through PUT');

  await request(app).delete(`/api/trips/${id}`).expect(200);
  await request(app).get(`/api/trips/${id}`).expect(404);
});

test('x-user-id header cannot impersonate another user', async () => {
  const res = await request(app).get('/api/trips').set('x-user-id', 'someone_else').expect(200);
  assert.ok(res.body.data.every((t) => t.userId === 'user_demo_123'));
});

test('deleting a trip that does not exist touches nothing', async () => {
  const before = await request(app).get('/api/trips/trip_demo_manali_4d').expect(200);
  assert.ok(before.body.data.itinerary, 'demo trip has an itinerary');
  await request(app).delete('/api/trips/trip_missing_123').expect(404);
  const after = await request(app).get('/api/trips/trip_demo_manali_4d').expect(200);
  assert.ok(after.body.data.itinerary, 'demo itinerary must still exist');
});

test('generate: unknown fields are dropped and defaults filled', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Goa', startDate: future(8), durationDays: 2, totalBudget: 8000, hack: true })
    .expect(200);
  assert.equal(res.body.preferences.hack, undefined);
  assert.equal(res.body.preferences.travelStyle, 'Balanced');
  const b = res.body.data.budgetBreakdown;
  assert.equal(b.totalEstimated, b.accommodation + b.activitiesAndSightseeing + b.foodAndDining + b.localTransport);
});

test('save: a broken itinerary is rejected with a clear message', async () => {
  const res = await request(app)
    .post('/api/trips')
    .send({
      tripData: { destination: 'Goa', startDate: future(5), endDate: future(6), travelersCount: 2, totalBudget: 9000 },
      itinerary: { title: 'Goa', days: [] },
    })
    .expect(400);
  assert.match(res.body.error, /at least one day/);
});

test('save: itinerary is normalized before storing', async () => {
  const gen = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Jaipur', startDate: future(12), durationDays: 2, totalBudget: 10000 })
    .expect(200);
  const { preferences, data } = gen.body;
  const saved = await request(app)
    .post('/api/trips')
    .send({ tripData: { ...preferences, title: data.title }, itinerary: data })
    .expect(201);
  const loaded = await request(app).get(`/api/trips/${saved.body.data.id}`).expect(200);
  assert.deepEqual(loaded.body.data.itinerary, data, 'what you save is what you get back');
});

test('update: date changes recalculate duration and bad values are rejected', async () => {
  const saved = await request(app)
    .post('/api/trips')
    .send({ tripData: { destination: 'Goa', startDate: future(5), endDate: future(7), travelersCount: 2, totalBudget: 9000 } })
    .expect(201);
  const id = saved.body.data.id;
  const res = await request(app).put(`/api/trips/${id}`).send({ endDate: future(10) }).expect(200);
  assert.equal(res.body.data.durationDays, 6);
  const bad = await request(app).put(`/api/trips/${id}`).send({ endDate: future(1) }).expect(400);
  assert.equal(bad.body.error, 'End date cannot be before start date.');
  await request(app).put(`/api/trips/${id}`).send({ travelersCount: 'many' }).expect(400);
});
