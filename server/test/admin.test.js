import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { AiUsage, User } = await import('../src/models/index.js');

/** Part 17 — admin dashboard API. ADMIN_EMAILS in tests: boss@example.com, second.admin@example.com (scripts/setup-tests.js). */

before(startTestDb);
after(stopTestDb);

const signUp = async (name, email) => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'secret123' }).expect(201);
  return { agent, user: res.body.data };
};
const planAndSave = async (agent, destination) => {
  const start = addDays(todayIso(), 9);
  const gen = await agent.post('/api/trips/generate').send({ destination, startDate: start, endDate: addDays(start, 1), totalBudget: 20000 }).expect(200);
  await agent.post('/api/trips').send({ tripData: { ...gen.body.preferences, title: gen.body.data.title }, itinerary: gen.body.data }).expect(201);
};

test('only admins: ADMIN_EMAILS (any case) or the stored role; everyone else 401 / 403; the demo account never', async () => {
  const boss = await signUp('Boss', 'Boss@Example.com');
  assert.equal(boss.user.role, 'admin', 'e-mail in ADMIN_EMAILS');
  assert.equal((await boss.agent.get('/api/auth/me').expect(200)).body.data.role, 'admin');
  await boss.agent.get('/api/admin/stats').expect(200);

  const normal = await signUp('Normal User', 'normal@example.com');
  assert.equal(normal.user.role, 'user');
  const forbidden = await normal.agent.get('/api/admin/stats').expect(403);
  assert.equal(forbidden.body.success, false);
  await request(app).get('/api/admin/stats').expect(401);

  await User.updateOne({ email: 'normal@example.com' }, { role: 'admin' });
  await normal.agent.get('/api/admin/stats').expect(200);

  const demo = request.agent(app);
  const d = await demo.post('/api/auth/demo').expect(200);
  assert.equal(d.body.data.role, 'user');
  await demo.get('/api/admin/stats').expect(403);
  await boss.agent.get('/api/admin/stats').query({ days: 12 }).expect(400);
});

test('stats: users, trips per day, popular destinations, plan sources, AI calls, messages', async () => {
  const admin = await signUp('Second Admin', 'second.admin@example.com');
  const a = await signUp('Asha', 'asha@example.com');
  const b = await signUp('Bilal', 'bilal@example.com');
  await planAndSave(a.agent, 'Goa');
  await planAndSave(b.agent, 'goa ');
  await planAndSave(b.agent, 'Manali');
  await request(app).post('/api/contact').send({ name: 'Visitor', email: 'v@example.com', message: 'Please add Sikkim to the planner.' }).expect(201);
  await AiUsage.create({ user: a.user.id, day: todayIso(), count: 4 });
  await AiUsage.create({ user: b.user.id, day: addDays(todayIso(), -2), count: 2 });
  await AiUsage.create({ user: b.user.id, day: addDays(todayIso(), -40), count: 9 }); // outside 30 days

  const s = (await admin.agent.get('/api/admin/stats').query({ days: 7 }).expect(200)).body.data;
  assert.equal(s.range.days, 7);
  assert.equal(s.tripsPerDay.length, 7);
  assert.equal(s.tripsPerDay.at(-1).date, todayIso());
  assert.ok(s.tripsPerDay.at(-1).count >= 3, 'today’s trips');
  assert.ok(s.signupsPerDay.at(-1).count >= 3);
  assert.ok(s.totals.users >= 3, 'the demo account is not counted');
  const goa = s.popularDestinations.find((p) => p.destination.toLowerCase() === 'goa');
  assert.ok(goa.trips >= 2, '"Goa" and "goa " are one place');
  assert.equal(s.planSources.find((p) => p.source === 'offline').trips >= 3, true);
  assert.equal(s.ai.enabled, false);
  assert.equal(s.ai.callsToday, 4);
  assert.equal(s.ai.callsInRange, 6, 'only days inside the range');
  assert.equal(s.ai.callsPerDay.at(-1).count, 4);
  assert.equal(s.ai.callsPerDay.at(-3).count, 2);
  assert.ok(s.totals.unreadMessages >= 1);
  assert.ok(!JSON.stringify(s).includes('asha@example.com'), 'stats hold no personal details');
});

test('messages inbox (read / unread / delete) and the users list with trip counts', async () => {
  const admin = await signUp('Boss Two', 'BOSS@example.com'.replace('BOSS', 'boss2')); // not an admin e-mail
  await admin.agent.get('/api/admin/messages').expect(403);
  await User.updateOne({ email: 'boss2@example.com' }, { role: 'admin' });

  await request(app).post('/api/contact').send({ name: 'Ravi', email: 'ravi@example.com', message: 'The map is great, thank you!' }).expect(201);
  const all = (await admin.agent.get('/api/admin/messages').expect(200)).body.data;
  const ravi = all.find((m) => m.name === 'Ravi');
  assert.equal(ravi.status, 'new');
  assert.equal(all[0].id, ravi.id, 'newest first');
  await admin.agent.put(`/api/admin/messages/${ravi.id}`).send({ status: 'read' }).expect(200);
  const unread = (await admin.agent.get('/api/admin/messages').query({ status: 'new' }).expect(200)).body.data;
  assert.ok(!unread.some((m) => m.id === ravi.id));
  await admin.agent.put(`/api/admin/messages/${ravi.id}`).send({ status: 'archived' }).expect(400);
  await admin.agent.delete(`/api/admin/messages/${ravi.id}`).expect(200);
  await admin.agent.delete(`/api/admin/messages/${ravi.id}`).expect(404);
  await admin.agent.put('/api/admin/messages/nope').send({ status: 'read' }).expect(404);

  const users = (await admin.agent.get('/api/admin/users').expect(200)).body.data;
  const asha = users.find((u) => u.email === 'asha@example.com');
  assert.equal(asha.trips, 1);
  assert.ok(!('passwordHash' in asha));
  const boss = users.find((u) => u.email === 'boss@example.com');
  assert.equal(boss.role, 'admin');
  const found = (await admin.agent.get('/api/admin/users').query({ q: 'bil' }).expect(200)).body.data;
  assert.deepEqual(found.map((u) => u.email), ['bilal@example.com']);
  assert.deepEqual((await admin.agent.get('/api/admin/users').query({ q: '.*' }).expect(200)).body.data, [], 'search text is not a pattern');
});
