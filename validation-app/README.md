# Server-Side Validation Demo (Node.js + Express)

Registration app that validates every input **on the server**, so the rules hold even when the browser form is bypassed (curl, dev tools, API clients).

**Author:** Vinaya Chaudhari · PRN 202401100119 · Batch B2

## Run locally
```bash
npm install
npm start          # http://localhost:3000
npm test           # 33 automated tests (unit + HTTP)
```
Requires Node 18+.

## Project structure
| File | Role |
|---|---|
| `server.js` | App setup: body parsers (size-limited), security headers, static files, 404 + error handlers |
| `src/routes.js` | Routing and request/response handling (GET pages, POST form, POST JSON API) |
| `src/validators.js` | All validation rules and input normalisation (pure module, unit-tested) |
| `src/store.js` | In-memory user store; passwords hashed with `crypto.scrypt` + random salt |
| `src/views.js` | HTML templates; every dynamic value HTML-escaped |
| `public/` | CSS and one tiny script that focuses the error summary |
| `test/` | `node:test` unit tests for rules and HTTP tests for the full flow |

## Routes
| Method | Path | Behaviour |
|---|---|---|
| GET | `/` | Registration form |
| POST | `/register` | Validate → `422` form with errors / `409` duplicate / `303` redirect to success |
| GET | `/success/:id` | Success message (Post/Redirect/Get: refresh never re-submits) |
| GET | `/users` | Registered users (no passwords) |
| GET | `/about` | Rules and request flow |
| POST | `/api/register` | Same validator, JSON: `201`, `422`, `409`, `400` |

## Validation rules
- **Full name** 2–60 chars; letters, spaces, `'` `-`, optional dot (initials, "Jr.")
- **Username** 3–20 chars, starts with a letter, letters/digits/underscore, unique
- **Email** valid format, ≤254 chars, unique (stored lowercase)
- **Mobile** 10 digits starting 6–9 (spaces/hyphens ignored)
- **Age** whole number 18–120
- **Password** 8–64 chars with upper, lower, digit, symbol; must not contain the username
- **Confirm password** must match

## Test it
Valid and invalid inputs are covered in `test/`. Manual checks:
```bash
# invalid -> 422 with a message per field
curl -i -X POST localhost:3000/api/register -H "Content-Type: application/json" \
  -d '{"fullName":"A","email":"nope","age":"12"}'

# valid -> 201
curl -i -X POST localhost:3000/api/register -H "Content-Type: application/json" \
  -d '{"fullName":"Vinaya Chaudhari","username":"vinaya_c","email":"v@example.com","phone":"9876543210","age":"20","password":"Str0ng!Pass","confirmPassword":"Str0ng!Pass"}'

# same again -> 409 duplicate
```

## Deploy on Render (free)
1. Push this folder to a GitHub repository (`node_modules` is git-ignored).
2. On https://render.com choose **New → Web Service** and connect the repo.
3. Settings: **Runtime** Node, **Build Command** `npm install`, **Start Command** `npm start`.
4. Click **Create Web Service**. Render sets `PORT` automatically; the app already reads `process.env.PORT`.
5. Open the `https://<name>.onrender.com` URL. Free instances sleep when idle, so the first load can take ~30 s, and in-memory users reset on restart.

Railway, Cyclic-style hosts or any VPS work the same way: `npm install && npm start`.

## Security notes
Input size limits (10 kb), HTML escaping on output, CSP and `X-Content-Type-Options` headers, hashed passwords, passwords never echoed back into the form, generic error text for unexpected failures.
