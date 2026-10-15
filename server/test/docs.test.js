import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { buildOpenApi, documentedEndpoints } = await import('../src/docs/openapi.js');

/** Part 18 — API documentation: /api/openapi.json and /api/docs must describe exactly the routes the server has. */

before(startTestDb);
after(stopTestDb);

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
const LEGACY_PREFIXES = ['/api/places']; // old Part 1 addresses, kept working but not advertised

/** Every route the server defines, read from app.js and the route files: "get /api/trips/{id}" … */
const definedRoutes = () => {
  const appSource = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
  const imports = new Map();
  for (const m of appSource.matchAll(/import\s+(\{[^}]+\}|\w+)\s+from\s+'\.\/routes\/(\w+\.js)'/g)) {
    const names = m[1].startsWith('{') ? m[1].slice(1, -1).split(',').map((n) => n.trim()) : [m[1]];
    for (const n of names) imports.set(n, m[2]);
  }
  const routes = [];
  for (const [, mount, name] of appSource.matchAll(/app\.use\('(\/api\/[\w/-]+)',\s*(?:\w+,\s*)*(\w+)\)/g)) {
    const file = imports.get(name);
    if (!file) continue; // e.g. the rate limiter
    const source = fs.readFileSync(path.join(SRC, 'routes', file), 'utf8');
    const routerVar = new RegExp(`export const ${name}\\s*=`).test(source) ? name : 'router';
    for (const [, method, sub] of source.matchAll(new RegExp(`${routerVar}\\.(get|post|put|patch|delete)\\('([^']*)'`, 'g'))) {
      const full = (mount + (sub === '/' ? '' : sub)).replace(/:(\w+)/g, '{$1}');
      routes.push(`${method} ${full}`);
    }
  }
  for (const [, method, full] of appSource.matchAll(/app\.(get|post|put|delete)\('(\/api\/[^']+)'/g)) routes.push(`${method} ${full}`);
  return routes;
};

test('openapi.json: valid 3.1 document, every $ref resolves, request bodies come from the shared schemas', async () => {
  const res = await request(app).get('/api/openapi.json').expect(200);
  const spec = res.body;
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.info.title, 'TripPlanner API');
  assert.ok(Object.keys(spec.paths).length >= 30);

  const refs = JSON.stringify(spec).match(/"\$ref":"#\/components\/(schemas|responses)\/(\w+)"/g) ?? [];
  for (const ref of refs) {
    const [, kind, name] = ref.match(/components\/(\w+)\/(\w+)/);
    assert.ok(spec.components[kind][name], `missing ${kind}/${name}`);
  }
  const register = spec.components.schemas.Register;
  assert.deepEqual(register.required, ['name', 'email', 'password']);
  assert.equal(register.properties.password.minLength, 8, 'same rule as the server');
  const trips = spec.paths['/trips/{id}'];
  assert.deepEqual(trips.get.security, [{ cookieAuth: [] }]);
  assert.equal(trips.get.parameters[0].name, 'id');
  assert.ok(spec.paths['/admin/stats'].get.description.includes('Admins only'));
  assert.equal(buildOpenApi(), buildOpenApi(), 'built once');
});

test('the documentation lists exactly the routes the server has (nothing missing, nothing extra)', async () => {
  const documented = documentedEndpoints.map((e) => `${e.method} ${e.path}`).sort();
  const defined = definedRoutes()
    .filter((r) => !LEGACY_PREFIXES.some((p) => r.split(' ')[1].startsWith(p)))
    .filter((r) => !['get /api/openapi.json', 'get /api/docs'].includes(r))
    .sort();
  assert.ok(defined.length >= 40, `found ${defined.length} routes`);
  assert.deepEqual(documented, defined);

  // and each documented address really answers (not the "Cannot find endpoint" 404)
  for (const { method, path: p } of documentedEndpoints) {
    const url = p.replace('{id}', '665f1c0d2a9b3c4d5e6f7a8b').replace('{expenseId}', 'x1').replace('{slug}', 'goa');
    const res = await request(app)[method](url).send({});
    assert.ok(!/Cannot find endpoint/.test(res.body?.error ?? ''), `${method.toUpperCase()} ${url} is not a route`);
  }
});

test('/api/docs: a readable page with every endpoint, no scripts (fits the Content Security Policy)', async () => {
  const res = await request(app).get('/api/docs').expect(200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.ok(!/<script/i.test(res.text), 'no scripts');
  assert.equal((res.text.match(/<span class="method /g) ?? []).length, documentedEndpoints.length);
  assert.match(res.text, /POST<\/span><code class="path">\/api\/trips\/generate<\/code>/);
  assert.match(res.text, /<span class="badge admin">admin<\/span>/);
  assert.match(res.text, /<code>password<\/code> <span class="req">required<\/span>/);
});
