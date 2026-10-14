import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDb, stopTestDb } from '../scripts/test-db.js';

const { default: app } = await import('../src/app.js');
const { User } = await import('../src/models/index.js');

before(startTestDb);
after(stopTestDb);

const newUser = (n) => ({ name: `User ${n}`, email: `user${n}@example.com`, password: 'secret123' });
const sessionCookie = (res) => (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('tp_session='));

test('register logs you in with an httpOnly cookie and never returns the password', async () => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(newUser(1)).expect(201);
  assert.equal(res.body.data.email, 'user1@example.com');
  assert.equal(res.body.data.passwordHash, undefined);
  const cookie = sessionCookie(res);
  assert.ok(cookie, 'session cookie set');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);

  const me = await agent.get('/api/auth/me').expect(200);
  assert.equal(me.body.data.name, 'User 1');
  assert.equal(me.body.data.tripCount, 0);
  assert.equal(me.body.data.passwordHash, undefined);
});

test('password is stored as a bcrypt hash', async () => {
  const user = await User.findOne({ email: 'user1@example.com' }).select('+passwordHash').lean();
  assert.match(user.passwordHash, /^\$2[aby]\$10\$/);
  assert.notEqual(user.passwordHash, 'secret123');
});

test('register: duplicate email (any case) → 409', async () => {
  const res = await request(app).post('/api/auth/register').send({ ...newUser(1), email: 'USER1@example.com' }).expect(409);
  assert.equal(res.body.error, 'An account with this email already exists.');
});

test('register: shared validation messages', async () => {
  const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'abc' }).expect(400);
  assert.equal(res.body.details.fields.name, 'Name must be at least 2 characters.');
  assert.equal(res.body.details.fields.email, 'Please enter a valid email address.');
  assert.equal(res.body.details.fields.password, 'Password must be at least 8 characters.');
});

test('login: wrong password and unknown email give the same message', async () => {
  const wrong = await request(app).post('/api/auth/login').send({ email: 'user1@example.com', password: 'nope12345' }).expect(401);
  const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'nope12345' }).expect(401);
  assert.equal(wrong.body.error, 'Invalid email or password.');
  assert.equal(unknown.body.error, wrong.body.error);
});

test('login → me → logout → me is 401', async () => {
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ email: 'User1@Example.com', password: 'secret123' }).expect(200);
  assert.match(sessionCookie(login), /Max-Age=\d+/, 'remember me (default) keeps the cookie for days');
  await agent.get('/api/auth/me').expect(200);
  await agent.post('/api/auth/logout').expect(200);
  const after = await agent.get('/api/auth/me').expect(401);
  assert.equal(after.body.error, 'Please log in to continue.');
});

test('login without "remember me" sets a browser-session cookie', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user1@example.com', password: 'secret123', rememberMe: false })
    .expect(200);
  const cookie = sessionCookie(res);
  assert.doesNotMatch(cookie, /Max-Age|Expires/i);
});

test('tampered or garbage token → 401 and the cookie is cleared', async () => {
  const res = await request(app).get('/api/auth/me').set('Cookie', 'tp_session=abc.def.ghi').expect(401);
  assert.match(sessionCookie(res) ?? '', /tp_session=;/);
});

test('Authorization: Bearer token also works (Postman / API tools)', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'user1@example.com', password: 'secret123' });
  const token = sessionCookie(login).split(';')[0].split('=')[1];
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(me.body.data.email, 'user1@example.com');
});

test('demo login gives the demo account with a sample trip', async () => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/demo').expect(200);
  assert.equal(res.body.data.isDemo, true);
  const trips = await agent.get('/api/trips').expect(200);
  assert.equal(trips.body.count, 1);
  assert.equal(trips.body.data[0].destination, 'Manali');
  assert.equal(trips.body.data[0].itinerary, undefined, 'list does not send the big itinerary');
  const full = await agent.get(`/api/trips/${trips.body.data[0].id}`).expect(200);
  assert.equal(full.body.data.itinerary.source, 'sample');
  assert.equal(full.body.data.itinerary.days.length, 4);

  // Calling it again re-uses the same account (no duplicates)
  await request(app).post('/api/auth/demo').expect(200);
  assert.equal(await User.countDocuments({ email: 'demo@tripplanner.com' }), 1);
});
