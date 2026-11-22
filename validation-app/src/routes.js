'use strict';
/** routes.js — routing + request/response handling. */
const express = require('express');
const { validateRegistration } = require('./validators');
const store = require('./store');
const views = require('./views');

const router = express.Router();

// ---- Pages (GET) -----------------------------------------------------------
router.get('/', (req, res) => res.send(views.registerPage()));
router.get('/about', (req, res) => res.send(views.aboutPage()));
router.get('/users', (req, res) => res.send(views.usersPage(store.all())));

router.get('/success/:id', (req, res, next) => {
  const user = store.get(req.params.id);
  if (!user) return next(); // unknown id -> 404
  res.send(views.successPage(user));
});

// ---- Form submit (POST) ----------------------------------------------------
router.post('/register', (req, res) => {
  const { errors, values } = validateRegistration(req.body);

  if (Object.keys(errors).length) {
    return res.status(422).send(views.registerPage({ values, errors }));
  }

  // Uniqueness checks run only once the input itself is valid
  const dup = {};
  if (store.findByEmail(values.email)) dup.email = 'An account with this email already exists.';
  if (store.findByUsername(values.username)) dup.username = 'That username is taken. Try another.';
  if (Object.keys(dup).length) return res.status(409).send(views.registerPage({ values, errors: dup }));

  const user = store.add(values);
  res.redirect(303, `/success/${user.id}`); // Post/Redirect/Get
});

// ---- JSON API (same validator) --------------------------------------------
router.post('/api/register', (req, res) => {
  const { valid, errors, values } = validateRegistration(req.body);
  if (!valid) return res.status(422).json({ success: false, message: 'Validation failed.', errors });

  if (store.findByEmail(values.email)) return res.status(409).json({ success: false, message: 'Email already registered.', errors: { email: 'An account with this email already exists.' } });
  if (store.findByUsername(values.username)) return res.status(409).json({ success: false, message: 'Username taken.', errors: { username: 'That username is taken. Try another.' } });

  const user = store.add(values);
  res.status(201).json({ success: true, message: 'Account created.', user: { id: user.id, fullName: user.fullName, username: user.username, email: user.email } });
});

module.exports = router;
