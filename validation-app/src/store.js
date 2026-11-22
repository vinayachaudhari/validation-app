'use strict';
/** store.js — tiny in-memory "database" (resets when the server restarts). */
const crypto = require('node:crypto');

const users = new Map(); // id -> user

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function findByEmail(email) {
  for (const u of users.values()) if (u.email === email) return u;
}
function findByUsername(username) {
  for (const u of users.values()) if (u.username.toLowerCase() === username.toLowerCase()) return u;
}

function add({ password, confirmPassword, ...profile }) {
  const id = crypto.randomUUID().slice(0, 8);
  const user = { id, ...profile, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  users.set(id, user);
  return user;
}

const get = (id) => users.get(id);
const all = () => [...users.values()];
const clear = () => users.clear();

module.exports = { add, get, all, clear, findByEmail, findByUsername };
