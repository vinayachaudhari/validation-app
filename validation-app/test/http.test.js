'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const store = require('../src/store');

let server, base;
test.before(async () => {
  await new Promise((r) => { server = createApp().listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(() => store.clear());

const good = {
  fullName: 'Vinaya Chaudhari', username: 'vinaya_c', email: 'vinaya@example.com',
  phone: '9876543210', age: '20', password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass',
};
const form = (data) => ({
  method: 'POST', redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(data).toString(),
});
const json = (data) => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});

test('GET / serves the form', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Create an account/);
});

test('POST /register with valid data -> 303 redirect to success page', async () => {
  const res = await fetch(base + '/register', form(good));
  assert.equal(res.status, 303);
  const loc = res.headers.get('location');
  assert.match(loc, /^\/success\/[0-9a-f-]+$/);
  const page = await fetch(base + loc);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Account created/);
});

test('POST /register with invalid data -> 422, messages shown, input kept, password not echoed', async () => {
  const res = await fetch(base + '/register', form({ ...good, email: 'bad', age: '12', fullName: 'Keep Me' }));
  assert.equal(res.status, 422);
  const html = await res.text();
  assert.match(html, /Enter a valid email address/);
  assert.match(html, /Age must be between 18 and 120/);
  assert.match(html, /value="Keep Me"/);
  assert.doesNotMatch(html, /Str0ng!Pass/);
  assert.equal(store.all().length, 0);
});

test('HTML in input is escaped in the response (XSS)', async () => {
  const res = await fetch(base + '/register', form({ ...good, fullName: '<script>alert(1)</script>' }));
  const html = await res.text();
  assert.equal(res.status, 422);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('duplicate email / username -> 409', async () => {
  await fetch(base + '/register', form(good));
  const r1 = await fetch(base + '/register', form({ ...good, username: 'other_user' }));
  assert.equal(r1.status, 409);
  assert.match(await r1.text(), /email already exists/);
  const r2 = await fetch(base + '/register', form({ ...good, email: 'new@example.com', username: 'VINAYA_C' }));
  assert.equal(r2.status, 409);
  assert.match(await r2.text(), /username is taken/i);
});

test('API: 201 for valid, 422 for invalid, 409 for duplicate, 400 for bad JSON', async () => {
  const ok = await fetch(base + '/api/register', json(good));
  assert.equal(ok.status, 201);
  const body = await ok.json();
  assert.equal(body.success, true);
  assert.equal(body.user.passwordHash, undefined);

  const bad = await fetch(base + '/api/register', json({ fullName: 'A', email: 'nope', age: '12' }));
  assert.equal(bad.status, 422);
  const badBody = await bad.json();
  assert.equal(badBody.success, false);
  assert.ok(badBody.errors.email && badBody.errors.age && badBody.errors.fullName);

  const dup = await fetch(base + '/api/register', json(good));
  assert.equal(dup.status, 409);

  const broken = await fetch(base + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(broken.status, 400);
});

test('passwords are stored hashed, never in plain text', async () => {
  await fetch(base + '/register', form(good));
  const [u] = store.all();
  assert.notEqual(u.passwordHash, good.password);
  assert.match(u.passwordHash, /^[0-9a-f]{32}:[0-9a-f]{64}$/);
  assert.equal(u.password, undefined);
});

test('unknown routes and wrong methods -> 404', async () => {
  assert.equal((await fetch(base + '/nope')).status, 404);
  assert.equal((await fetch(base + '/success/doesnotexist')).status, 404);
  assert.equal((await fetch(base + '/register')).status, 404); // GET on a POST-only route
  assert.equal((await fetch(base + '/api/nope')).status, 404);
});

test('oversized body -> 413', async () => {
  const res = await fetch(base + '/api/register', json({ fullName: 'x'.repeat(20000) }));
  assert.equal(res.status, 413);
});
