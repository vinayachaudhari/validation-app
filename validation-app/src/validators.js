'use strict';
/**
 * validators.js — all validation rules live here (one module, no Express
 * dependency), so they can be unit-tested on their own.
 *
 * validateRegistration(input) -> { valid, errors, values }
 *   errors: { fieldName: "message" }  (first failing rule per field)
 *   values: trimmed / normalised copy of the input, safe to store
 */

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;          // 3-20 chars, starts with a letter
const NAME_RE = /^[A-Za-z]+\.?(?:[ '-][A-Za-z]+\.?)*$/;          // words of letters; ' or - joins parts; optional dot (initials, Jr.)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;                              // Indian mobile number

const isString = (v) => typeof v === 'string';

function clean(input) {
  input = input && typeof input === 'object' ? input : {};
  const pick = (k) => (isString(input[k]) ? input[k] : '');
  return {
    fullName: pick('fullName').trim().replace(/\s+/g, ' '),
    username: pick('username').trim(),
    email: pick('email').trim().toLowerCase(),
    phone: pick('phone').replace(/[\s-]/g, ''),
    age: pick('age').trim(),
    password: pick('password'),          // never trimmed: spaces may be intentional
    confirmPassword: pick('confirmPassword'),
  };
}

const rules = {
  fullName(v) {
    if (!v) return 'Enter your full name.';
    if (v.length < 2 || v.length > 60) return 'Full name must be 2–60 characters long.';
    if (!NAME_RE.test(v)) return 'Full name can contain only letters, spaces, apostrophes, dots and hyphens.';
  },
  username(v) {
    if (!v) return 'Choose a username.';
    if (!USERNAME_RE.test(v))
      return 'Username must be 3–20 characters, start with a letter, and use only letters, digits or underscores.';
  },
  email(v) {
    if (!v) return 'Enter your email address.';
    if (v.length > 254) return 'Email address is too long.';
    if (!EMAIL_RE.test(v)) return 'Enter a valid email address, like name@example.com.';
  },
  phone(v) {
    if (!v) return 'Enter your mobile number.';
    if (!PHONE_RE.test(v)) return 'Mobile number must be 10 digits and start with 6, 7, 8 or 9.';
  },
  age(v) {
    if (!v) return 'Enter your age.';
    if (!/^\d+$/.test(v)) return 'Age must be a whole number.';
    const n = Number(v);
    if (n < 18 || n > 120) return 'Age must be between 18 and 120.';
  },
  password(v) {
    if (!v) return 'Create a password.';
    if (v.length < 8 || v.length > 64) return 'Password must be 8–64 characters long.';
    const missing = [];
    if (!/[a-z]/.test(v)) missing.push('a lowercase letter');
    if (!/[A-Z]/.test(v)) missing.push('an uppercase letter');
    if (!/\d/.test(v)) missing.push('a digit');
    if (!/[^A-Za-z0-9]/.test(v)) missing.push('a special character');
    if (missing.length) return `Password needs ${missing.join(', ')}.`;
  },
};

function validateRegistration(input) {
  const values = clean(input);
  const errors = {};

  for (const field of Object.keys(rules)) {
    const msg = rules[field](values[field]);
    if (msg) errors[field] = msg;
  }

  // Cross-field rules run only when the individual fields are fine
  if (!errors.password) {
    if (!values.confirmPassword) errors.confirmPassword = 'Re-enter your password to confirm it.';
    else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
    else if (!errors.username && values.password.toLowerCase().includes(values.username.toLowerCase()))
      errors.password = 'Password must not contain your username.';
  }

  return { valid: Object.keys(errors).length === 0, errors, values };
}

module.exports = { validateRegistration, clean };
