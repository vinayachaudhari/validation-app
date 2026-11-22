'use strict';
/** views.js — HTML templates as plain functions. Every dynamic value goes through esc(). */

const AUTHOR = 'Vinaya Chaudhari · PRN 202401100119 · Batch B2';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · Server-side validation</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="top">
    <a class="brand" href="/">Validation Lab</a>
    <nav><a href="/">Register</a><a href="/users">Registered users</a><a href="/about">How it works</a></nav>
  </header>
  <main>${body}</main>
  <footer>${esc(AUTHOR)}</footer>
</body>
</html>`;
}

const FIELDS = [
  { name: 'fullName', label: 'Full name', type: 'text', autocomplete: 'name', hint: 'Letters, spaces, apostrophes, dots, hyphens' },
  { name: 'username', label: 'Username', type: 'text', autocomplete: 'username', hint: '3–20 characters, starts with a letter' },
  { name: 'email', label: 'Email', type: 'text', autocomplete: 'email', hint: 'name@example.com' },
  { name: 'phone', label: 'Mobile number', type: 'text', autocomplete: 'tel', hint: '10 digits, starts with 6–9' },
  { name: 'age', label: 'Age', type: 'text', autocomplete: 'off', hint: '18 to 120' },
  { name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password', hint: '8–64 characters with upper, lower, digit and symbol' },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password', autocomplete: 'new-password', hint: '' },
];

function registerPage({ values = {}, errors = {} } = {}) {
  const fieldErrors = Object.entries(errors).filter(([f]) => f !== 'form');
  const count = fieldErrors.length;
  const heading = errors.form
    ? esc(errors.form)
    : `${count === 1 ? '1 field needs' : count + ' fields need'} fixing before this can be saved.`;
  const summary = Object.keys(errors).length
    ? `<div class="alert error" role="alert" tabindex="-1" id="summary">
         <strong>${heading}</strong>
         ${count ? `<ul>${fieldErrors.map(([f, m]) => `<li><a href="#${esc(f)}">${esc(m)}</a></li>`).join('')}</ul>` : ''}
       </div>`
    : '';

  const rows = FIELDS.map((f) => {
    const err = errors[f.name];
    const isPw = f.type === 'password';
    return `<div class="field${err ? ' invalid' : ''}">
      <label for="${f.name}">${f.label}</label>
      <input id="${f.name}" name="${f.name}" type="${f.type}" autocomplete="${f.autocomplete}"
             value="${isPw ? '' : esc(values[f.name])}"
             ${err ? `aria-invalid="true" aria-describedby="${f.name}-msg"` : (f.hint ? `aria-describedby="${f.name}-msg"` : '')}>
      <p class="msg" id="${f.name}-msg">${err ? esc(err) : esc(f.hint)}</p>
    </div>`;
  }).join('');

  return layout('Register', `
    <section class="card">
      <h1>Create an account</h1>
      <p class="lead">Every field is checked on the server when you press <em>Create account</em>. Try bad input and see what comes back.</p>
      ${summary}
      <form method="POST" action="/register" novalidate>${rows}
        <button type="submit">Create account</button>
      </form>
    </section>
    ${summary ? '<script src="/app.js"></script>' : ''}`);
}

function successPage(user) {
  return layout('Account created', `
    <section class="card">
      <div class="alert success" role="status"><strong>Account created.</strong> All checks passed on the server.</div>
      <h1>Welcome, ${esc(user.fullName)}</h1>
      <dl class="summary">
        <dt>Username</dt><dd>${esc(user.username)}</dd>
        <dt>Email</dt><dd>${esc(user.email)}</dd>
        <dt>Mobile</dt><dd>${esc(user.phone)}</dd>
        <dt>Age</dt><dd>${esc(user.age)}</dd>
        <dt>Reference</dt><dd>${esc(user.id)}</dd>
      </dl>
      <p><a class="btn" href="/">Register another user</a> <a href="/users">See all users</a></p>
    </section>`);
}

function usersPage(users) {
  const rows = users.length
    ? users.map((u) => `<tr><td>${esc(u.fullName)}</td><td>${esc(u.username)}</td><td>${esc(u.email)}</td><td>${esc(u.createdAt.slice(0, 19).replace('T', ' '))}</td></tr>`).join('')
    : '<tr><td colspan="4" class="empty">No one has registered yet. <a href="/">Register the first account.</a></td></tr>';
  return layout('Registered users', `
    <section class="card wide">
      <h1>Registered users</h1>
      <p class="lead">Stored in server memory only; passwords are salted and hashed with scrypt and never shown.</p>
      <div class="scroll"><table>
        <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Created (UTC)</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </section>`);
}

function aboutPage() {
  return layout('How it works', `
    <section class="card wide">
      <h1>How the validation works</h1>
      <p class="lead">The browser is never trusted. Even if someone bypasses the form (curl, dev tools), the server applies the same rules.</p>
      <h2>Request flow</h2>
      <ol>
        <li><code>GET /</code> returns the empty form.</li>
        <li><code>POST /register</code> parses the body, trims and normalises it, then validates every field.</li>
        <li>On failure the form is re-rendered with status <code>422</code>, the user's input kept (except passwords) and a message under each bad field.</li>
        <li>On a duplicate username or email the server answers <code>409</code>.</li>
        <li>On success the user is saved and redirected with <code>303</code> to <code>GET /success/:id</code>, so refreshing never re-submits the form.</li>
      </ol>
      <h2>JSON endpoint</h2>
      <p>The same validator backs <code>POST /api/register</code>. Try it:</p>
      <pre>curl -i -X POST http://localhost:3000/api/register \\
  -H "Content-Type: application/json" \\
  -d '{"fullName":"A","email":"nope","age":"12"}'</pre>
      <h2>Rules</h2>
      <table>
        <tbody>
          <tr><th>Full name</th><td>2–60 characters; letters, spaces, ' . -</td></tr>
          <tr><th>Username</th><td>3–20 characters, starts with a letter, letters/digits/underscore, unique</td></tr>
          <tr><th>Email</th><td>Valid format, up to 254 characters, unique</td></tr>
          <tr><th>Mobile</th><td>10 digits starting with 6–9</td></tr>
          <tr><th>Age</th><td>Whole number, 18–120</td></tr>
          <tr><th>Password</th><td>8–64 characters with upper, lower, digit and symbol; must not contain the username</td></tr>
          <tr><th>Confirm</th><td>Must match the password</td></tr>
        </tbody>
      </table>
    </section>`);
}

function notFoundPage() {
  return layout('Not found', `<section class="card"><h1>Page not found</h1><p class="lead">That address does not exist. <a href="/">Back to the form.</a></p></section>`);
}

module.exports = { registerPage, successPage, usersPage, aboutPage, notFoundPage, esc };
