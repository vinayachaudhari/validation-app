'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistration } = require('../src/validators');

const good = {
  fullName: 'Vinaya Chaudhari', username: 'vinaya_c', email: 'Vinaya@Example.com',
  phone: '98765 43210', age: '20', password: 'Str0ng!Pass', confirmPassword: 'Str0ng!Pass',
};
const withChange = (patch) => validateRegistration({ ...good, ...patch });

test('valid input passes and is normalised', () => {
  const r = validateRegistration(good);
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, {});
  assert.equal(r.values.email, 'vinaya@example.com');
  assert.equal(r.values.phone, '9876543210');
});

test('empty body reports every required field', () => {
  const r = validateRegistration({});
  assert.equal(r.valid, false);
  for (const f of ['fullName', 'username', 'email', 'phone', 'age', 'password'])
    assert.ok(r.errors[f], `${f} should have an error`);
});

test('non-object / non-string input does not crash', () => {
  assert.equal(validateRegistration(undefined).valid, false);
  assert.equal(validateRegistration(null).valid, false);
  assert.equal(validateRegistration({ ...good, age: 20, username: ['a'] }).valid, false);
});

const invalid = [
  ['fullName', { fullName: 'A' }],
  ['fullName', { fullName: 'R2D2 <script>' }],
  ['username', { username: '1abc' }],
  ['username', { username: 'ab' }],
  ['username', { username: 'has space' }],
  ['email', { email: 'not-an-email' }],
  ['email', { email: 'a@b' }],
  ['phone', { phone: '12345' }],
  ['phone', { phone: '5876543210' }],
  ['age', { age: '17' }],
  ['age', { age: '121' }],
  ['age', { age: '20.5' }],
  ['age', { age: 'abc' }],
  ['password', { password: 'short1!', confirmPassword: 'short1!' }],
  ['password', { password: 'alllowercase1!', confirmPassword: 'alllowercase1!' }],
  ['password', { password: 'NoDigits!!', confirmPassword: 'NoDigits!!' }],
  ['password', { password: 'NoSymbol123', confirmPassword: 'NoSymbol123' }],
  ['password', { password: 'Vinaya_c#123', confirmPassword: 'Vinaya_c#123' }],
  ['confirmPassword', { confirmPassword: 'Different1!' }],
  ['confirmPassword', { confirmPassword: '' }],
];
for (const [field, patch] of invalid) {
  test(`rejects bad ${field}: ${JSON.stringify(patch).slice(0, 50)}`, () => {
    const r = withChange(patch);
    assert.equal(r.valid, false);
    assert.ok(r.errors[field], `expected error on ${field}, got ${JSON.stringify(r.errors)}`);
  });
}

test('boundary values are accepted', () => {
  assert.equal(withChange({ age: '18' }).valid, true);
  assert.equal(withChange({ age: '120' }).valid, true);
  assert.equal(withChange({ username: 'abc' }).valid, true);
  assert.equal(withChange({ fullName: "Mary-Ann O'Neil Jr." }).valid, true);
});
