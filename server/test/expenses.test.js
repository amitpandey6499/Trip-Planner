import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { Expense } = await import('../src/models/index.js');

/** Part 15 — expenses, people and settling up, through the API. */

before(startTestDb);
after(stopTestDb);

let n = 0;
const user = async (name = 'Neha Verma') => {
  const agent = request.agent(app);
  n += 1;
  await agent.post('/api/auth/register').send({ name, email: `exp${n}@example.com`, password: 'secret123' }).expect(201);
  return agent;
};
const savedTrip = async (agent, travelersCount = 3) => {
  const start = addDays(todayIso(), 10);
  const gen = await agent.post('/api/trips/generate').send({ destination: 'Goa', startDate: start, endDate: addDays(start, 2), travelersCount, totalBudget: 45000 }).expect(200);
  const saved = await agent.post('/api/trips').send({ tripData: { ...gen.body.preferences, title: gen.body.data.title }, itinerary: gen.body.data }).expect(201);
  return { id: saved.body.data.id, itinerary: gen.body.data, start };
};
const equal = (...members) => ({ mode: 'equal', members });

test('people: start from the number of travellers (owner first), rename / add; trips are private', async () => {
  const agent = await user();
  const { id } = await savedTrip(agent, 3);
  const ledger = (await agent.get(`/api/trips/${id}/expenses`).expect(200)).body.data;
  assert.deepEqual(ledger.members.map((m) => m.name), ['Neha', 'Traveller 2', 'Traveller 3']);
  assert.ok(ledger.members.every((m) => /^m-[0-9a-f]{6}$/.test(m.id)));
  assert.equal(ledger.summary.totalPaise, 0);
  assert.deepEqual(ledger.settlements, []);

  const [me, two, three] = ledger.members;
  const renamed = (
    await agent
      .put(`/api/trips/${id}/members`)
      .send({ members: [me, { id: two.id, name: 'Aman' }, { id: three.id, name: 'Priya' }, { name: 'Kabir' }] })
      .expect(200)
  ).body.data;
  assert.deepEqual(renamed.members.map((m) => m.name), ['Neha', 'Aman', 'Priya', 'Kabir']);
  assert.equal(renamed.members[1].id, two.id, 'renaming keeps the id');
  assert.notEqual(renamed.members[3].id, undefined);
  await agent.put(`/api/trips/${id}/members`).send({ members: [{ name: 'A' }, { name: 'a' }] }).expect(400);

  const stranger = await user('Rohit');
  await stranger.get(`/api/trips/${id}/expenses`).expect(404);
  await stranger.post(`/api/trips/${id}/expenses`).send({}).expect(400);
  await request(app).get(`/api/trips/${id}/expenses`).expect(401);
});

test('first visit from two tabs at once: both get the same people, no error', async () => {
  const agent = await user();
  const { id } = await savedTrip(agent, 2);
  const answers = await Promise.all([1, 2, 3].map(() => agent.get(`/api/trips/${id}/expenses`)));
  assert.deepEqual(answers.map((r) => r.status), [200, 200, 200]);
  const ids = answers.map((r) => r.body.data.members.map((m) => m.id).join());
  assert.equal(new Set(ids).size, 1, 'one list of people');
});

test('expenses: add (equal / exact), balances and the fewest payments; edit; delete; checks', async () => {
  const agent = await user();
  const { id, start } = await savedTrip(agent, 3);
  const members = (await agent.get(`/api/trips/${id}/expenses`).expect(200)).body.data.members;
  const [neha, t2, t3] = members.map((m) => m.id);

  await agent.post(`/api/trips/${id}/expenses`).send({ description: 'Hotel', amountPaise: 900000, category: 'stay', date: start, paidBy: neha, split: equal(neha, t2, t3) }).expect(201);
  await agent
    .post(`/api/trips/${id}/expenses`)
    .send({ description: 'Scooter rent', amountPaise: 100000, category: 'transport', date: start, paidBy: t2, split: { mode: 'exact', shares: [{ memberId: t2, amountPaise: 40000 }, { memberId: t3, amountPaise: 60000 }] } })
    .expect(201);
  const ledger = (
    await agent.post(`/api/trips/${id}/expenses`).send({ description: 'Train to Goa', amountPaise: 330000, category: 'travel', date: addDays(start, -1), paidBy: t3, split: equal(neha, t2, t3) }).expect(201)
  ).body.data;

  assert.equal(ledger.expenses.length, 3);
  assert.equal(ledger.expenses[0].description, 'Scooter rent', 'newest date first');
  assert.equal(ledger.summary.totalPaise, 1330000);
  assert.equal(ledger.summary.outsidePlanPaise, 330000, 'travel to Goa is not in the estimate');
  assert.equal(ledger.summary.vsPlan.find((v) => v.key === 'accommodation').actualPaise, 900000);
  const balance = (mid) => ledger.balances.find((b) => b.memberId === mid).balancePaise;
  assert.equal(balance(neha), 900000 - 300000 - 110000);
  assert.equal(balance(t2), 100000 - 300000 - 40000 - 110000);
  assert.equal(balance(t3), 330000 - 300000 - 60000 - 110000);
  assert.equal(ledger.settlements.length, 2);
  assert.deepEqual(ledger.settlements[0], { from: t2, to: neha, amountPaise: 350000 });

  // edit: the hotel was ₹9,300 and only for two
  const hotel = ledger.expenses.find((e) => e.description === 'Hotel');
  const edited = (await agent.put(`/api/trips/${id}/expenses/${hotel.id}`).send({ description: 'Hotel (2 nights)', amountPaise: 930000, category: 'stay', date: start, paidBy: neha, split: equal(neha, t2) }).expect(200)).body.data;
  assert.equal(edited.summary.totalPaise, 1360000);
  assert.deepEqual(edited.expenses.find((e) => e.id === hotel.id).split, { mode: 'equal', members: [neha, t2] });

  // checks: unknown person, sums, other trips' expenses
  const bad = await agent.post(`/api/trips/${id}/expenses`).send({ description: 'X', amountPaise: 100, category: 'food', date: start, paidBy: 'm-nobody', split: equal(neha) }).expect(400);
  assert.match(bad.body.error, /not part of this trip/);
  const sum = await agent
    .post(`/api/trips/${id}/expenses`)
    .send({ description: 'X', amountPaise: 1000, category: 'food', date: start, paidBy: neha, split: { mode: 'exact', shares: [{ memberId: neha, amountPaise: 300 }] } })
    .expect(400);
  assert.equal(sum.body.details.fields.split, 'The shares add up to ₹3, but the amount is ₹10.');
  await agent.put(`/api/trips/${id}/expenses/not-an-id`).send({ description: 'X', amountPaise: 100, category: 'food', date: start, paidBy: neha, split: equal(neha) }).expect(404);

  const after = (await agent.delete(`/api/trips/${id}/expenses/${hotel.id}`).expect(200)).body.data;
  assert.equal(after.expenses.length, 2);
  const stranger = await user('Rohit');
  await stranger.delete(`/api/trips/${id}/expenses/${after.expenses[0].id}`).expect(404);
});

test('settle up: record the suggested payments → everyone even; a payment back can be undone; people in use can not be removed', async () => {
  const agent = await user();
  const { id, start } = await savedTrip(agent, 2);
  const [a, b] = (await agent.get(`/api/trips/${id}/expenses`).expect(200)).body.data.members.map((m) => m.id);
  const ledger = (await agent.post(`/api/trips/${id}/expenses`).send({ description: 'Dinner', amountPaise: 240050, category: 'food', date: start, paidBy: a, split: equal(a, b) }).expect(201)).body.data;
  const [pay] = ledger.settlements;
  assert.deepEqual(pay, { from: b, to: a, amountPaise: 120025 });

  const settled = (await agent.post(`/api/trips/${id}/settlements`).send({ ...pay, date: todayIso() }).expect(201)).body.data;
  assert.ok(settled.balances.every((x) => x.balancePaise === 0));
  assert.deepEqual(settled.settlements, []);
  assert.equal(settled.summary.totalPaise, 240050, 'paying back is not spending');
  const payment = settled.expenses.find((e) => e.kind === 'settlement');
  await agent.put(`/api/trips/${id}/expenses/${payment.id}`).send({ description: 'X', amountPaise: 100, category: 'food', date: start, paidBy: a, split: equal(a) }).expect(400);
  const undone = (await agent.delete(`/api/trips/${id}/expenses/${payment.id}`).expect(200)).body.data;
  assert.equal(undone.settlements.length, 1);
  await agent.post(`/api/trips/${id}/settlements`).send({ from: a, to: a, amountPaise: 100, date: start }).expect(400);

  const blocked = await agent.put(`/api/trips/${id}/members`).send({ members: [{ id: a, name: 'Neha' }] }).expect(409);
  assert.match(blocked.body.error, /is in 1 expense\. Change or delete it first\./);

  // deleting the trip deletes its expenses
  await agent.delete(`/api/trips/${id}`).expect(200);
  assert.equal(await Expense.countDocuments({ trip: id }), 0);
  await agent.get(`/api/trips/${id}/expenses`).expect(404);
});

test('expenses are never part of the public share page', async () => {
  const agent = await user();
  const { id, start } = await savedTrip(agent, 2);
  const [a, b] = (await agent.get(`/api/trips/${id}/expenses`).expect(200)).body.data.members.map((m) => m.id);
  await agent.post(`/api/trips/${id}/expenses`).send({ description: 'Secret shopping', amountPaise: 999900, category: 'shopping', date: start, paidBy: a, split: equal(a, b) }).expect(201);
  await agent.put(`/api/trips/${id}/members`).send({ members: [{ id: a, name: 'Neha' }, { id: b, name: 'Hidden Friend' }] }).expect(200);
  const { slug } = (await agent.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200)).body.data;
  const text = JSON.stringify((await request(app).get(`/api/share/${slug}`).expect(200)).body);
  assert.ok(!text.includes('Secret shopping') && !text.includes('Hidden Friend') && !text.includes('members'));
});
