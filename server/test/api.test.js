import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

const { default: app } = await import('../src/app.js');

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
    .send({ destination: 'Goa', totalBudget: 'abc' })
    .expect(400);
  assert.equal(res.body.details.field, 'totalBudget');
});

test('generate: end date before start date is rejected', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Goa', startDate: '2026-12-10', endDate: '2026-12-01' })
    .expect(400);
  assert.equal(res.body.details.field, 'endDate');
});

test('generate: dates decide the duration and endDate is returned', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Manali', startDate: '2026-11-12', endDate: '2026-11-15' })
    .expect(200);
  assert.equal(res.body.preferences.durationDays, 4);
  assert.equal(res.body.preferences.endDate, '2026-11-15');
  assert.equal(res.body.data.days.length, 4);
});

test('generate: missing endDate is calculated from duration', async () => {
  const res = await request(app)
    .post('/api/trips/generate')
    .send({ destination: 'Goa', startDate: '2026-12-01', durationDays: 3 })
    .expect(200);
  assert.equal(res.body.preferences.endDate, '2026-12-03');
});

test('trips: save, list, update (only allowed fields), delete', async () => {
  const saved = await request(app)
    .post('/api/trips')
    .send({ tripData: { destination: 'Goa', title: 'Beach week' }, itinerary: { days: [] } })
    .expect(201);
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
