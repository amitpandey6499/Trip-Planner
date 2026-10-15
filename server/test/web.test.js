import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { addDays, todayIso } from '@tripplanner/shared';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { clientApp, withShareMeta } = await import('../src/web/clientApp.js');

/** Part 18 — one service for app + API: Express serves the built React app, with link previews for /share pages. */

const dists = [];
before(startTestDb);
after(async () => {
  for (const dir of dists) fs.rmSync(dir, { recursive: true, force: true });
  await stopTestDb();
});

const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Plan trips across India." />
    <meta property="og:title" content="TripPlanner" />
    <meta name="twitter:card" content="summary" />
    <title>TripPlanner</title>
    <script type="module" src="/assets/index-abc123.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;

/** A fake client/dist folder. */
const makeDist = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-dist-'));
  dists.push(dir);
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), TEMPLATE);
  fs.writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log("app")');
  fs.writeFileSync(path.join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return dir;
};

const webApp = (distDir) => {
  const web = express();
  web.get('/api/health', (req, res) => res.json({ ok: true }));
  web.use(clientApp({ distDir }));
  web.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
  return web;
};

test('withShareMeta: replaces the general preview tags, escapes the trip text, keeps the rest of the page', () => {
  const html = withShareMeta(TEMPLATE, {
    title: 'Goa "Beach" <Trip> · TripPlanner',
    description: '3 days in Goa & around',
    url: 'https://tripplanner.example/share/AbCdEfGhIjK',
    image: 'https://upload.wikimedia.org/goa.jpg',
  });
  assert.match(html, /<title>Goa &quot;Beach&quot; &lt;Trip&gt; · TripPlanner<\/title>/);
  assert.match(html, /<meta property="og:title" content="Goa &quot;Beach&quot; &lt;Trip&gt; · TripPlanner" \/>/);
  assert.match(html, /<meta property="og:description" content="3 days in Goa &amp; around" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/upload.wikimedia.org\/goa.jpg" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.equal(html.match(/name="description"/g).length, 1, 'the general description is replaced, not doubled');
  assert.equal(html.match(/property="og:title"/g).length, 1);
  assert.ok(!html.includes('<Trip>'), 'no raw HTML from the trip title');
  assert.ok(html.includes('<script type="module" src="/assets/index-abc123.js"></script>'), 'the app still loads');
  assert.equal(withShareMeta(TEMPLATE, null), TEMPLATE, 'no meta → page unchanged');
});

test('serves the React app: hashed assets cached for a year, pages never cached, deep links → index.html, /api untouched', async () => {
  const web = webApp(makeDist());

  const asset = await request(web).get('/assets/index-abc123.js').expect(200);
  assert.match(asset.headers['cache-control'], /max-age=31536000/);
  assert.match(asset.headers['cache-control'], /immutable/);
  await request(web).get('/assets/missing-file.js').expect(404); // never index.html for a missing script

  const icon = await request(web).get('/favicon.svg').expect(200);
  assert.match(icon.headers['cache-control'], /max-age=3600/);

  for (const page of ['/', '/trips/665f1c0d2a9b3c4d5e6f7a8b', '/explore/goa', '/admin', '/no-such-page']) {
    const res = await request(web).get(page).expect(200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.equal(res.headers['cache-control'], 'no-cache', page);
    assert.ok(res.text.includes('<div id="root"></div>'), page);
  }

  const api = await request(web).get('/api/health').expect(200);
  assert.deepEqual(api.body, { ok: true });
  const missingApi = await request(web).get('/api/nothing-here').expect(404);
  assert.equal(missingApi.body.success, false, 'unknown /api paths stay JSON 404s');
  await request(web).post('/some-page').expect(404);
});

test('/share/:slug: link preview with the trip (no view counted); unknown or switched-off links get the plain page', async () => {
  const owner = request.agent(app);
  await owner.post('/api/auth/register').send({ name: 'Meera Iyer', email: 'web1@example.com', password: 'secret123' }).expect(201);
  const start = addDays(todayIso(), 20);
  const gen = await owner.post('/api/trips/generate').send({ destination: 'Goa', startDate: start, endDate: addDays(start, 2), totalBudget: 30000 }).expect(200);
  const saved = await owner
    .post('/api/trips')
    .send({ tripData: { ...gen.body.preferences, title: 'Meera <Goa> Trip' }, preferences: gen.body.preferences, itinerary: gen.body.data })
    .expect(201);
  const id = saved.body.data.id;
  const { slug } = (await owner.put(`/api/trips/${id}/share`).send({ enabled: true }).expect(200)).body.data;

  const web = webApp(makeDist());
  const page = await request(web).get(`/share/${slug}`).expect(200);
  assert.match(page.text, /<title>Meera &lt;Goa&gt; Trip · TripPlanner<\/title>/);
  assert.match(page.text, /<meta property="og:description" content="3 days in Goa \(/);
  assert.match(page.text, new RegExp(`<meta property="og:url" content="http://localhost:5173/share/${slug}" />`));
  assert.equal(page.headers['cache-control'], 'no-cache');

  const info = await owner.get(`/api/trips/${id}/share`).expect(200);
  assert.equal(info.body.data.views, 0, 'link previews (WhatsApp bots) are not views');

  const unknown = await request(web).get('/share/NoSuchLink1').expect(200);
  assert.match(unknown.text, /<title>TripPlanner<\/title>/);
  await owner.put(`/api/trips/${id}/share`).send({ enabled: false }).expect(200);
  const off = await request(web).get(`/share/${slug}`).expect(200);
  assert.ok(!off.text.includes('Meera'), 'a switched-off link shows nothing of the trip');
});

test('security headers: content security policy, referrer policy for map tiles, no x-powered-by', async () => {
  const res = await request(app).get('/api/health').expect(200);
  const csp = res.headers['content-security-policy'];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'(;|$)/, 'no inline or outside scripts');
  assert.match(csp, /img-src 'self' data: blob: https:/, 'map tiles and photos');
  assert.match(csp, /worker-src 'self' blob:/, 'confetti worker');
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin', 'OpenStreetMap tiles need a Referer');
  assert.equal(res.headers['x-powered-by'], undefined);
});
