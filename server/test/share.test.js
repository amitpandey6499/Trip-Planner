import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { addDays, normalizeItinerary, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { buildPdfContent, pdfFileName } = await import('../src/services/export/tripPdf.js');

/** Part 14 — share links (public, read-only), "save a copy", PDF export. */

before(startTestDb);
after(stopTestDb);

let n = 0;
const user = async (name = 'Riya Sharma') => {
  const agent = request.agent(app);
  n += 1;
  await agent.post('/api/auth/register').send({ name, email: `share${n}@example.com`, password: 'secret123' }).expect(201);
  return agent;
};

/** A saved offline-planner trip with a private home city, notes and packing ticks. */
const savedTrip = async (agent, destination = 'Goa', days = 3) => {
  const start = addDays(todayIso(), 12);
  const gen = await agent
    .post('/api/trips/generate')
    .send({ destination, startDate: start, endDate: addDays(start, days - 1), totalBudget: 30000, specialNotes: 'My private note', originCity: 'Ghaziabad' })
    .expect(200);
  const saved = await agent
    .post('/api/trips')
    .send({ tripData: { ...gen.body.preferences, title: gen.body.data.title }, preferences: gen.body.preferences, itinerary: gen.body.data })
    .expect(201);
  await agent.put(`/api/trips/${saved.body.data.id}`).send({ packingChecked: ['swimwear'] }).expect(200);
  return { id: saved.body.data.id, itinerary: gen.body.data };
};

const binary = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};
const pageCount = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

test('share link: off by default, on → public read-only page without private details; views count visitors only', async () => {
  const owner = await user();
  const { id } = await savedTrip(owner);
  const info = await owner.get(`/api/trips/${id}/share`).expect(200);
  assert.equal(info.body.data.enabled, false);
  assert.equal(info.body.data.slug, null);

  const on = await owner.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200);
  const { slug, url } = on.body.data;
  assert.match(slug, /^[A-Za-z0-9_-]{11}$/);
  assert.equal(url, `http://localhost:5173/share/${slug}`);

  const pub = await request(app).get(`/api/share/${slug}`).expect(200);
  const shared = pub.body.data;
  assert.equal(shared.destination, 'Goa');
  assert.equal(shared.sharedBy, 'Riya', 'first name only');
  assert.equal(shared.itinerary.days.length, 3);
  assert.equal(shared.isOwner, false);
  const text = JSON.stringify(shared);
  for (const secret of ['My private note', 'Ghaziabad', 'swimwear', 'share1@example.com', 'userId', 'packingChecked']) {
    assert.ok(!text.includes(secret), `public page must not contain ${secret}`);
  }
  await request(app).get(`/api/share/${slug}`).expect(200);
  const mine = await owner.get(`/api/share/${slug}`).expect(200);
  assert.equal(mine.body.data.isOwner, true);
  assert.equal(mine.body.data.views, 2, 'two visitors; the owner is not counted');
  assert.equal(mine.body.data.tripId, id);

  // Sharing does not count as a change of the trip (the map update compares updatedAt).
  const before = (await owner.get(`/api/trips/${id}`).expect(200)).body.data.updatedAt;
  await owner.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200);
  assert.equal((await owner.get(`/api/trips/${id}`).expect(200)).body.data.updatedAt, before);
});

test('share link: off → 404; on again → same address; new link → old address stops working; only the owner decides', async () => {
  const owner = await user();
  const { id } = await savedTrip(owner, 'Jaipur', 2);
  const { slug } = (await owner.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200)).body.data;
  await owner.put(`/api/trips/${id}/share`).send({ enabled: false }).expect(200);
  const off = await request(app).get(`/api/share/${slug}`).expect(404);
  assert.match(off.body.error, /not available/);
  assert.equal((await owner.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200)).body.data.slug, slug);

  const fresh = (await owner.put(`/api/trips/${id}/share`).send({ enabled: true, newLink: true }).expect(200)).body.data;
  assert.notEqual(fresh.slug, slug);
  assert.equal(fresh.views, 0);
  await request(app).get(`/api/share/${slug}`).expect(404);
  await request(app).get(`/api/share/${fresh.slug}`).expect(200);

  const other = await user('Kabir');
  await other.put(`/api/trips/${id}/share`).send({ enabled: false }).expect(404);
  await request(app).put(`/api/trips/${id}/share`).send({ enabled: true }).expect(401);
  await owner.put(`/api/trips/${id}/share`).send({}).expect(400);
  await request(app).get('/api/share/not a slug!').expect(404);

  await owner.delete(`/api/trips/${id}`).expect(200);
  await request(app).get(`/api/share/${fresh.slug}`).expect(404);
});

test('save a copy: needs login, becomes the visitor’s own trip (not shared, no private details of the owner)', async () => {
  const owner = await user();
  const { id, itinerary } = await savedTrip(owner, 'Manali', 3);
  const { slug } = (await owner.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200)).body.data;
  await request(app).post(`/api/share/${slug}/copy`).expect(401);

  const friend = await user('Aman Verma');
  const copy = (await friend.post(`/api/share/${slug}/copy`).expect(201)).body.data;
  assert.notEqual(copy.id, id);
  assert.equal(copy.share.enabled, false);
  assert.equal(copy.preferences.specialNotes, '');
  assert.equal(copy.preferences.originCity, undefined);
  assert.deepEqual(copy.packingChecked, []);
  assert.deepEqual(
    copy.itinerary.days.map((d) => d.activities.map((a) => a.placeName)),
    itinerary.days.map((d) => d.activities.map((a) => a.placeName)),
  );
  const list = (await friend.get('/api/trips').expect(200)).body.data;
  assert.deepEqual(list.map((t) => t.id), [copy.id]);
  await friend.delete(`/api/trips/${copy.id}`).expect(200);
  await request(app).get(`/api/share/${slug}`).expect(200); // the original is untouched
});

test('PDF: plan on screen (saved or not), shared link PDF with QR; bad plans refused', async () => {
  const owner = await user();
  const { id, itinerary } = await savedTrip(owner, 'Goa', 3);

  const unsaved = await owner.post('/api/trips/pdf').send({ itinerary }).buffer(true).parse(binary).expect(200);
  assert.equal(unsaved.headers['content-type'], 'application/pdf');
  assert.match(unsaved.headers['content-disposition'], /attachment; filename=".*\.pdf"/);
  assert.equal(unsaved.body.subarray(0, 5).toString(), '%PDF-');
  assert.equal(pageCount(unsaved.body), 5, 'cover + 3 days + stays / food / costs');

  await request(app).post('/api/trips/pdf').send({ itinerary }).expect(401);
  await owner.post('/api/trips/pdf').send({ itinerary: { destination: 'Goa', days: [{ title: 'Empty', activities: [] }] } }).expect(400);
  await owner.post('/api/trips/pdf').send({}).expect(400);

  const { slug } = (await owner.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200)).body.data;
  const pub = await request(app).get(`/api/share/${slug}/pdf`).buffer(true).parse(binary).expect(200);
  assert.equal(pub.headers['content-type'], 'application/pdf');
  assert.ok(pub.body.toString('latin1').includes('/Subtype /Image'), 'QR code of the link');
  await owner.put(`/api/trips/${id}/share`).send({ enabled: false }).expect(200);
  await request(app).get(`/api/share/${slug}/pdf`).expect(404);
});

test('PDF content: facts, budget verdict, one section per day with times, costs, tips and drives', () => {
  const it = normalizeItinerary(
    {
      destination: 'Manali',
      title: 'Hills & cafés',
      summary: 'Two easy days.',
      budgetBreakdown: {},
      hotels: [{ name: 'Mid-range hotel near Mall Road', pricePerNight: 3500, budgetTier: 'Moderate' }],
      restaurants: [{ name: 'Café 1947', cuisine: 'Café', costForTwo: 1000 }],
      days: [
        {
          title: 'Old Manali',
          activities: [
            { id: 'd1-a1', placeName: 'Hadimba Devi Temple', timeSlot: '09:00 AM - 11:00 AM', category: 'Attraction', cost: 200, tips: 'Go early', coordinates: { lat: 32.2483, lng: 77.1814 }, locationSource: 'curated' },
            { id: 'd1-a2', placeName: 'Café 1947', timeSlot: 'Around 01:00 PM', category: 'Restaurant', cost: 1000, coordinates: { lat: 32.2563, lng: 77.1802 }, locationSource: 'curated' },
          ],
        },
        { title: 'Rest day', activities: [{ placeName: 'Slow morning', timeSlot: 'All day', category: 'Activity' }] },
      ],
    },
    { startDate: '2026-12-01', endDate: '2026-12-02', durationDays: 2, travelersCount: 2, totalBudget: 4000, budgetCategory: 'Moderate' },
  );
  it.days[0].route = { provider: 'osrm', distanceKm: 3.2, durationMin: 11, stopIds: ['d1-a1', 'd1-a2'], legs: [{ distanceKm: 3.2, durationMin: 11 }], geometry: [], signature: 'x' };

  const c = buildPdfContent(it, { shareUrl: 'https://trip.example/share/abc', now: new Date('2026-10-15T10:00:00Z') });
  assert.equal(c.subtitle, 'Manali · 1 Dec 2026 – 2 Dec 2026 · 2 days · 2 travellers');
  assert.deepEqual(c.facts.find(([k]) => k === 'Dates'), ['Dates', 'Tue, 1 Dec 2026 – Wed, 2 Dec 2026']);
  assert.equal(c.verdict.over, true);
  assert.equal(it.estimatedTotal, 4700, 'temple 200 + café 1000 + 1 night × 1 room × 3500');
  assert.equal(c.verdict.text, 'Over budget by ₹700');
  assert.equal(c.verdict.amount, '₹700');
  assert.equal(c.days.length, 2);
  const [temple, cafe] = c.days[0].items;
  assert.deepEqual(temple.time, ['09:00 AM', 'to 11:00 AM']);
  assert.deepEqual(cafe.time, ['Around 01:00 PM']);
  assert.equal(temple.cost, '₹200');
  assert.equal(temple.tip, 'Tip: Go early');
  assert.equal(temple.leg, 'To the next stop: 3.2 km · 11 min by road');
  assert.ok(c.days[0].facts.includes('Driving today: 3.2 km · 11 min'));
  assert.deepEqual(c.days[1].items[0].time, ['All day']);
  assert.equal(c.days[1].items[0].cost, '', 'free things show no price');
  assert.equal(c.stays[0].detail, 'Moderate · ₹3,500 per room per night (estimate)');
  assert.equal(c.costs.length, 4);
  assert.equal(c.share.url, 'https://trip.example/share/abc');
  assert.equal(c.made, 'Made with TripPlanner on 15 Oct 2026');
  assert.equal(pdfFileName('Goa: sun / sand?'), 'TripPlanner - Goa sun sand .pdf'.replace('sand .pdf', 'sand.pdf'));
});
