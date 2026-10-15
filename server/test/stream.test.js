import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { setGeminiClientFactory } = await import('../src/services/ai/geminiClient.js');
const { createDayExtractor } = await import('../src/services/ai/dayStream.js');
const { AiCache } = await import('../src/models/index.js');

/**
 * Part 9 — live generation (Server-Sent Events) and "regenerate one day",
 * with a FAKE Gemini client that sends its JSON answer in small pieces.
 */
const future = (d) => addDays(todayIso(), d);
let aiOn = false;
let answers = [];
let calls = [];
let seenSignal = null;

const fakeClient = {
  model: 'fake-gemini',
  async generateJson(args) {
    calls.push(args);
    const next = answers.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(args) : next;
  },
  async generateJsonStream(args) {
    calls.push(args);
    seenSignal = args.signal;
    const next = answers.shift();
    if (next instanceof Error) throw next;
    const text = JSON.stringify(next);
    // 40-character pieces, like a real stream (days arrive one by one)
    for (let i = 40; i < text.length + 40; i += 40) {
      if (args.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      args.onText?.(text.slice(0, i));
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    return next;
  },
};

const day = (n, place = `Real Place ${n}`) => ({
  title: `Day ${n} {with braces} and "quotes"`,
  description: 'Tricky text: ] } [ { \\ "',
  activities: [
    { placeName: place, timeSlot: '09:00 AM - 11:00 AM', category: 'Attraction', description: 'x', cost: 200 },
    { placeName: 'Lunch at Ritz Classic', timeSlot: '01:00 PM - 02:00 PM', category: 'Restaurant', description: 'Goan thali', cost: 800 },
  ],
});
const answer = (days) => ({
  title: `${days} days in Goa`,
  summary: 'A test plan.',
  budgetBreakdown: { accommodation: 6000 },
  days: Array.from({ length: days }, (_, i) => day(i + 1)),
  hotels: [{ name: 'Test Hotel', pricePerNight: 3000, budgetTier: 'Moderate' }],
  restaurants: [{ name: 'Ritz Classic', cuisine: 'Goan', costForTwo: 1000 }],
});
const prefs = (destination, durationDays = 3, extra = {}) => ({
  destination,
  startDate: future(15),
  durationDays,
  totalBudget: 30000,
  travelersCount: 2,
  ...extra,
});

const parseEvents = (text) =>
  text
    .split('\n\n')
    .filter((block) => block.startsWith('event:'))
    .map((block) => {
      const [eventLine, dataLine] = block.split('\n');
      return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
    });
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
    .then((res) => ({ res, events: parseEvents(res.body) }));

let agent;
let n = 0;
before(async () => {
  await startTestDb();
  setGeminiClientFactory(() => (aiOn ? fakeClient : null));
});
after(async () => {
  setGeminiClientFactory(null);
  await stopTestDb();
});
beforeEach(async () => {
  aiOn = false;
  answers = [];
  calls = [];
  seenSignal = null;
  await AiCache.deleteMany({});
  agent = request.agent(app);
  n += 1;
  await agent.post('/api/auth/register').send({ name: 'Stream Tester', email: `stream${n}@example.com`, password: 'secret123' }).expect(201);
});

test('day extractor finds each day as soon as it is complete (strings with braces/quotes are fine)', () => {
  const text = JSON.stringify(answer(3));
  const found = [];
  const push = createDayExtractor((d, i) => found.push([i, d.title]));
  for (let i = 1; i <= text.length; i += 7) push(text.slice(0, i));
  push(text);
  assert.deepEqual(
    found.map(([i]) => i),
    [0, 1, 2],
  );
  assert.equal(found[1][1], 'Day 2 {with braces} and "quotes"');
});

test('stream with Gemini: progress → day 1, 2, 3 (in order) → result', async () => {
  aiOn = true;
  answers = [answer(3)];
  const { res, events } = await sse(agent.post('/api/trips/generate').send(prefs('Goa')));
  assert.match(res.headers['content-type'], /text\/event-stream/);
  const days = events.filter((e) => e.event === 'day');
  assert.deepEqual(days.map((e) => e.data.index), [0, 1, 2]);
  assert.equal(days[0].data.total, 3);
  assert.equal(days[1].data.day.date, future(16), 'preview days are dated');
  assert.ok(events.some((e) => e.event === 'progress' && e.data.stage === 'ai'));
  assert.ok(events.some((e) => e.event === 'progress' && /Day 2 of 3/.test(e.data.message)));
  const result = events.at(-1);
  assert.equal(result.event, 'result');
  assert.equal(result.data.data.source, 'gemini');
  assert.equal(result.data.meta.ai.used, 1);
  assert.equal(result.data.preferences.durationDays, 3);
});

test('stream: a rejected first answer sends "reset" before the retry', async () => {
  aiOn = true;
  answers = [answer(2), answer(3)];
  const { events } = await sse(agent.post('/api/trips/generate').send(prefs('Goa')));
  const names = events.map((e) => e.event);
  assert.ok(names.includes('reset'));
  assert.ok(names.indexOf('reset') > names.indexOf('day'), 'reset comes after the first (wrong) days');
  assert.ok(events.some((e) => e.event === 'progress' && e.data.stage === 'retry'));
  assert.equal(events.filter((e) => e.event === 'day' && names.indexOf('reset') < events.indexOf(e)).length, 3);
  assert.equal(events.at(-1).event, 'result');
});

test('stream without AI: offline planner days, then the result', async () => {
  const { events } = await sse(agent.post('/api/trips/generate').send(prefs('Manali', 4)));
  assert.equal(events.filter((e) => e.event === 'day').length, 4);
  assert.ok(events.some((e) => e.event === 'progress' && e.data.stage === 'offline'));
  assert.equal(events.at(-1).data.data.source, 'offline');
});

test('stream errors arrive as an "error" event with status and details', async () => {
  const { res, events } = await sse(agent.post('/api/trips/generate').send(prefs('Shimla')));
  assert.equal(res.status, 200, 'the stream itself opened fine');
  const error = events.at(-1);
  assert.equal(error.event, 'error');
  assert.equal(error.data.status, 422);
  assert.equal(error.data.details.field, 'destination');
  // Validation still answers before any stream starts:
  const bad = await agent.post('/api/trips/generate').set('Accept', 'text/event-stream').send({ destination: '' }).expect(400);
  assert.match(bad.headers['content-type'], /json/);
});

test('cancel: closing the stream stops Gemini (abort signal) and nothing more is sent', async () => {
  aiOn = true;
  answers = [answer(6)];
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const login = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cancel Tester', email: `cancel${n}@example.com`, password: 'secret123' }),
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const controller = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/trips/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Cookie: cookie },
      body: JSON.stringify(prefs('Goa', 6)),
      signal: controller.signal,
    });
    const reader = res.body.getReader();
    let text = '';
    while (!text.includes('event: day')) text += new TextDecoder().decode((await reader.read()).value);
    controller.abort();
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(seenSignal?.aborted, true, 'Gemini call was told to stop');
  } finally {
    server.close();
  }
});

// ── Regenerate one day ─────────────────────────────────────────────────────

const offlineTrip = async (destination = 'Manali', durationDays = 4, extra = {}) =>
  (await agent.post('/api/trips/generate').send(prefs(destination, durationDays, extra)).expect(200)).body;
const sights = (d) => d.activities.filter((a) => !['Transit', 'Restaurant'].includes(a.category)).map((a) => a.placeName);

test('regenerate one day (offline): new places, not used on other days; other days untouched; budget adds up', async () => {
  const { data, preferences } = await offlineTrip('Manali', 4);
  const res = await agent.post('/api/trips/regenerate-day').send({ preferences, itinerary: data, dayNumber: 2 }).expect(200);
  const it = res.body.data;
  assert.equal(res.body.meta.source, 'offline');
  assert.equal(res.body.meta.dayNumber, 2);
  assert.equal(it.days[1].date, data.days[1].date);
  assert.notDeepEqual(sights(it.days[1]), sights(data.days[1]), 'day 2 changed');
  const others = new Set([0, 2, 3].flatMap((i) => sights(data.days[i])));
  assert.ok(sights(it.days[1]).every((p) => !others.has(p)), 'nothing repeated from other days');
  for (const i of [0, 2, 3]) assert.deepEqual(it.days[i].activities, data.days[i].activities);
  const b = it.budgetBreakdown;
  assert.equal(b.totalEstimated, b.accommodation + b.activitiesAndSightseeing + b.foodAndDining + b.localTransport);
  assert.ok(it.days[1].activities.every((a) => a.locationSource === 'curated'));
  assert.equal(it.days[1].route, undefined, 'the changed day needs a new route');
});

test('regenerate one day: pace just for that day', async () => {
  const { data, preferences } = await offlineTrip('Jaipur', 4, { travelStyle: 'Relaxed' });
  const packed = await agent.post('/api/trips/regenerate-day').send({ preferences, itinerary: data, dayNumber: 3, pace: 'Packed' }).expect(200);
  assert.ok(sights(packed.body.data.days[2]).length > sights(data.days[2]).length, 'packed day has more places');
});

test('regenerate one day with Gemini: only that day is asked for, with what to avoid and the wish', async () => {
  const { data, preferences } = await offlineTrip('Goa', 3);
  aiOn = true;
  answers = [day(2, 'Fontainhas Latin Quarter')];
  const res = await agent
    .post('/api/trips/regenerate-day')
    .send({ preferences, itinerary: data, dayNumber: 2, note: 'more relaxed, add a heritage walk' })
    .expect(200);
  assert.equal(res.body.meta.source, 'gemini');
  assert.equal(res.body.meta.ai.used, 1);
  assert.equal(res.body.data.days[1].activities[0].placeName, 'Fontainhas Latin Quarter');
  assert.match(calls[0].prompt, /Write a NEW plan for Day 2 of a 3-day trip/);
  assert.match(calls[0].prompt, /do NOT repeat these/);
  assert.match(calls[0].prompt, /more relaxed, add a heritage walk/);
  assert.equal(calls[0].schema.properties.activities.type, 'array', 'asked for ONE day, not a whole trip');
});

test('regenerate one day: bad Gemini answers → offline day with an honest notice', async () => {
  const { data, preferences } = await offlineTrip('Goa', 3);
  aiOn = true;
  answers = [{ nonsense: true }, { activities: [] }];
  const res = await agent.post('/api/trips/regenerate-day').send({ preferences, itinerary: data, dayNumber: 3 }).expect(200);
  assert.equal(res.body.meta.source, 'offline');
  assert.match(res.body.meta.notice, /did not pass our checks/);
});

test('regenerate one day: input checks', async () => {
  const { data, preferences } = await offlineTrip('Goa', 3);
  const tooFar = await agent.post('/api/trips/regenerate-day').send({ preferences, itinerary: data, dayNumber: 4 }).expect(400);
  assert.equal(tooFar.body.details.fields.dayNumber, 'That day is not part of this trip.');
  const mismatch = await agent
    .post('/api/trips/regenerate-day')
    .send({ preferences: { ...preferences, durationDays: 5, endDate: undefined }, itinerary: data, dayNumber: 1 })
    .expect(400);
  assert.match(mismatch.body.error, /does not match the trip/);
  const note = await agent.post('/api/trips/regenerate-day').send({ preferences, itinerary: data, dayNumber: 1, note: 'x'.repeat(400) }).expect(400);
  assert.match(note.body.error, /at most 300/);
});
