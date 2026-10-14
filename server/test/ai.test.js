import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { setGeminiClientFactory } = await import('../src/services/ai/geminiClient.js');
const { AiCache } = await import('../src/models/index.js');

/**
 * The whole Gemini flow is tested with a FAKE client (no internet, no API key):
 * we control exactly what "Gemini" answers and count how often it is called.
 */
let answers = [];
let calls = [];
const fakeClient = {
  model: 'fake-gemini',
  async generateJson(args) {
    calls.push(args);
    const next = answers.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(args) : next;
  },
};

const future = (d) => addDays(todayIso(), d);
const goodAnswer = (days, destination = 'Goa') => ({
  title: `${days} days in ${destination}`,
  summary: 'A test plan.',
  budgetBreakdown: { accommodation: 6000 },
  days: Array.from({ length: days }, (_, i) => ({
    title: `Day ${i + 1}`,
    description: 'Test day',
    activities: [
      { placeName: `Real Place ${i + 1}`, timeSlot: '09:00 AM - 11:00 AM', category: 'Attraction', description: 'x', cost: 200, coordinates: { lat: 15.5, lng: 73.8 } },
      { placeName: 'Lunch at Ritz Classic', timeSlot: '01:00 PM - 02:00 PM', category: 'Restaurant', description: 'Goan thali', cost: 800 },
    ],
  })),
  hotels: [{ name: 'Test Hotel', pricePerNight: 3000, budgetTier: 'Moderate', amenities: ['WiFi'] }],
  restaurants: [{ name: 'Ritz Classic', cuisine: 'Goan', costForTwo: 1000 }],
});
const prefsFor = (destination, durationDays = 3, extra = {}) => ({
  destination,
  startDate: future(20),
  durationDays,
  totalBudget: 25000,
  travelersCount: 2,
  ...extra,
});

let agent;
let userCount = 0;
const newAgent = async () => {
  const a = request.agent(app);
  userCount += 1;
  await a.post('/api/auth/register').send({ name: 'AI Tester', email: `ai${userCount}@example.com`, password: 'secret123' }).expect(201);
  return a;
};

before(async () => {
  await startTestDb();
  setGeminiClientFactory(() => fakeClient);
});
after(async () => {
  setGeminiClientFactory(null);
  await stopTestDb();
});
beforeEach(async () => {
  answers = [];
  calls = [];
  await AiCache.deleteMany({});
  agent = await newAgent();
});

test('valid Gemini answer → normalized itinerary with model and usage info', async () => {
  answers = [goodAnswer(3)];
  const res = await agent.post('/api/trips/generate').send(prefsFor('Goa')).expect(200);
  assert.equal(res.body.data.source, 'gemini');
  assert.equal(res.body.data.model, 'fake-gemini');
  assert.equal(res.body.data.days.length, 3);
  assert.equal(res.body.data.days[0].date, future(20));
  assert.equal(res.body.meta.cached, false);
  assert.deepEqual(res.body.meta.ai, { allowed: true, used: 1, limit: 3, left: 2 });
  // what we sent to Gemini
  assert.match(calls[0].prompt, /Destination: Goa/);
  assert.match(calls[0].prompt, /Exactly 3 days/);
  assert.equal(calls[0].schema.properties.days.minItems, 3);
  assert.match(calls[0].system, /Never invent names/);
});

test('same request again is served from the cache (no Gemini call); ?fresh=1 asks again', async () => {
  answers = [goodAnswer(3), goodAnswer(3)];
  await agent.post('/api/trips/generate').send(prefsFor('Goa')).expect(200);
  const second = await agent.post('/api/trips/generate').send({ ...prefsFor('Goa'), startDate: future(22) }).expect(200);
  assert.equal(second.body.meta.cached, true);
  assert.equal(calls.length, 1, 'cache hit → no second call');
  assert.equal(second.body.data.days[0].date, future(22), 'cached plan is re-dated');
  const fresh = await agent.post('/api/trips/generate?fresh=1').send(prefsFor('Goa')).expect(200);
  assert.equal(fresh.body.meta.cached, false);
  assert.equal(calls.length, 2);
});

test('a wrong answer is retried once with the reason, then accepted', async () => {
  answers = [goodAnswer(2), goodAnswer(3)]; // first one has the wrong number of days
  const res = await agent.post('/api/trips/generate').send(prefsFor('Goa')).expect(200);
  assert.equal(res.body.data.source, 'gemini');
  assert.equal(calls.length, 2);
  assert.match(calls[1].prompt, /rejected because: Itinerary has 2 days but 3 were requested/);
});

test('two wrong answers → offline planner with an honest notice', async () => {
  answers = [{ nonsense: true }, { still: 'bad' }];
  const res = await agent.post('/api/trips/generate').send(prefsFor('Goa')).expect(200);
  assert.equal(res.body.data.source, 'offline');
  assert.match(res.body.meta.notice, /did not pass our checks.*offline planner/);
});

test('quota error is not retried and falls back offline', async () => {
  answers = [Object.assign(new Error('Resource has been exhausted (e.g. check quota).'), { status: 429 })];
  const res = await agent.post('/api/trips/generate').send(prefsFor('Jaipur')).expect(200);
  assert.equal(calls.length, 1);
  assert.equal(res.body.data.source, 'offline');
  assert.match(res.body.meta.notice, /free-tier limit/);
});

test('wrong model name gives a hint to fix GEMINI_MODEL', async () => {
  answers = [Object.assign(new Error('models/xyz is not found'), { status: 404 })];
  const res = await agent.post('/api/trips/generate').send(prefsFor('Goa')).expect(200);
  assert.match(res.body.meta.notice, /GEMINI_MODEL/);
});

test('Gemini fails for a place the offline planner does not know → 503 with a clear message', async () => {
  answers = [Object.assign(new Error('Internal error'), { status: 500 }), Object.assign(new Error('Internal error'), { status: 500 })];
  const res = await agent.post('/api/trips/generate').send(prefsFor('Shimla')).expect(503);
  assert.match(res.body.error, /Gemini is having trouble right now/);
  assert.ok(res.body.details.supported.includes('Goa'));
  assert.equal(calls.length, 2, '5xx is retried once');
});

test('daily AI limit: after 3 plans the 4th comes from the offline planner', async () => {
  answers = [goodAnswer(3), goodAnswer(3), goodAnswer(3)];
  for (let i = 0; i < 3; i += 1) {
    const res = await agent.post('/api/trips/generate?fresh=1').send(prefsFor('Goa')).expect(200);
    assert.equal(res.body.data.source, 'gemini');
  }
  const fourth = await agent.post('/api/trips/generate?fresh=1').send(prefsFor('Goa')).expect(200);
  assert.equal(fourth.body.data.source, 'offline');
  assert.match(fourth.body.meta.notice, /used all 3 AI plans for today/);
  assert.equal(calls.length, 3, 'no 4th Gemini call');
  const me = await agent.get('/api/auth/me').expect(200);
  assert.deepEqual(me.body.data.ai, { used: 3, limit: 3, left: 0 });
  // unknown place + limit reached → 429
  const blocked = await agent.post('/api/trips/generate?fresh=1').send(prefsFor('Shimla')).expect(429);
  assert.match(blocked.body.error, /used all 3 AI plans/);
});

test('limits are per user', async () => {
  answers = [goodAnswer(3)];
  const res = await agent.post('/api/trips/generate?fresh=1').send(prefsFor('Goa')).expect(200);
  assert.equal(res.body.meta.ai.used, 1, 'a new user starts at 0');
});

test('without any AI client: offline for known places, 422 for unknown', async () => {
  setGeminiClientFactory(() => null);
  try {
    const ok = await agent.post('/api/trips/generate').send(prefsFor('Udaipur')).expect(200);
    assert.equal(ok.body.meta.source, 'offline');
    const bad = await agent.post('/api/trips/generate').send(prefsFor('Shimla')).expect(422);
    assert.match(bad.body.error, /AI planning is not set up yet/);
  } finally {
    setGeminiClientFactory(() => fakeClient);
  }
});
