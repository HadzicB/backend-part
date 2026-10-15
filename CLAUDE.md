# Project context

Learning project: Next.js fullstack app. Developed ad hoc, no fixed roadmap.
Backend is decided: a separate Node app (this one), the frontend (`../frontend-part`) calls it over `fetch` from the Next server (server components/actions), not from the browser. Ask before adding backend-specific code.
Current state: signup and login work end to end, called by the frontend over `fetch`.
- `server.js` (raw `http`, port 8080) routes `POST /login`, `POST /signup`, `POST /logout` and `GET /me`; any other request returns 404. A central guard (`userAuthorized`) runs before routing: default deny, public list `POST /login`, `POST /signup`, checks the session with `authService.isSessionActive`.
- Each module is split in three layers (no ORM yet, the repository holds raw SQL; Drizzle will replace what is inside it):
  - `*.controller.js`: HTTP only (read `req`, parse the JSON body inline, call the service, map the result to a status, write `res`). Keeps the debug `console.log`s and the try/catch that returns 500.
  - `*.service.js`: business rules, no `req`/`res`, no SQL, no HTTP statuses (returns results like `{ reason: "validation" | "duplicate", errors }` or `null`; the controller maps them to 400/409/401).
  - `*.repository.js`: SQL only (`pool.query`), the only files importing `pool`. The `users` table belongs to the users module, so auth goes through `usersService`.
  - `auth.helpers.js`: `hashPassword` / `verifyPassword` (scrypt, `salt:hash`, constant-time compare). Rule: a helper lives next to who uses it; shared HTTP helpers live in `helpers/` (`sendJson.js`).
- Auth: `signup` validates on the server (400 field errors), hashes, creates the user (409 on duplicate email; the repository turns Postgres `23505` into `null`). `login` verifies the password, creates a random 64-hex session ID (20 minutes) in `sessions`, returns `{ user, session: { id, expiresAt } }` (401 on wrong credentials). `logout` deletes the session row (`Authorization: Bearer <id>`).
- Users: `GET /me` (`usersController.getCurrentUser`) uses `usersService.getUserBySession`, which returns the user only if `expires_at > now()` (200 with the user, 401 otherwise). `incrementLoginCount(userId)` does `login_count = login_count + 1` in SQL (no read-modify-write race); `login` calls it after the session insert.
- `db.js`: Pool plus `initDb()` creating the `practice` DB, `users` and `sessions` (`user_id` FK, `ON DELETE CASCADE`) if missing.
- Error handling: malformed JSON or a non-object body (`null`, `5`) returns 400 `{ message: "Invalid JSON" }` (inline in `signup`/`login` controllers; Express' `express.json()` replaces this later). `run()` in `server.js` catches anything else thrown in a step and returns 500 `{ message: "Something went wrong" }`. Public-route and route matching use the path without the query string.
- Decided: the guard stays a yes/no check (`isSessionActive`); no user on `req` until a real use case needs it (e.g. addresses owned by the logged-in user).
- Not built yet: expired-session cleanup, transactions for login (a failed counter update after the session insert leaves an orphan session row), CORS/`OPTIONS` (not needed while only the Next server calls the BE), 405 for a known path with the wrong method.

## Next steps (in order)

1. (done) Auth guard: central check before routing, default deny, public list `/login`, `/signup`. In Express later this becomes middleware. Putting the user on `req` is deferred until there is a use case.
2. (done) Central try/catch in `run()` and 400 for malformed JSON.
3. Cleanup of expired sessions.
4. Later: roles/permissions (`role` column, `requireRole`), forgot password (reset token with expiry), migrations instead of `CREATE TABLE IF NOT EXISTS`.

## Still unclear to me (re-explain simply when I ask, in Serbian if I write Serbian)

- Who checks that a session is active in `sessions`, and on which call: every protected BE endpoint checks it itself on every request that reaches it (cheap primary-key lookup); the FE does not ask `/me` before each action.
- `/me` (`usersController.getCurrentUser`) is a feature (returns the user), not the authorization itself; the guard's session check (`authService.isSessionActive`) is the shared check.
- Why the FE never talks to the DB: only the BE has the DB connection.

# How to work with me

- I'm learning: briefly explain the why, don't refactor or "fix" code I didn't ask about.
- Debug logging (console.log) is intentional. Don't remove it.
- Only change what I ask. Suggest improvements, don't apply them.
- When I ask for a review, list mistakes as concepts (what's wrong, why it matters, the fix), most important first.
- Don't print web Claude lesson prompts unless I ask. When I do ask: SHORT and focused on the ONE core concept (max 2 if inseparable), one or two diagrams, practical "how to implement it", no side topics. Concept-only: no code snippets or project specifics (file names, components); describe mistakes as general concepts/anti-patterns.
- NEVER overwrite an existing file without reading it first (especially `package.json`: my `pnpm init` fields and manual scripts must be preserved). Edit only the specific lines needed, never rewrite whole files.
- Keep answers short, a few lines at a time.
- When giving terminal commands, explain what each line/flag does.
- Avoid OS-specific tooling (no Homebrew services). I work on Mac now but may switch to Windows.

# Conventions

- pnpm for packages
- ESM (`import`/`export`, `"type": "module"`), not CommonJS `require`

# Project layout

```
my-app/
├─ frontend-part/   (this Next.js app)
├─ backend-part/    (Node BE, own package.json)
└─ db/              (local Postgres data + SQL)
```

# Decisions log

Update this section as decisions get made (e.g. "BE is now a separate app at ../backend-part").

- Goal: become confident enough to apply for full stack positions. Favor industry-standard patterns and explain how they come up in interviews.
- Backend: separate Node + Express app (TypeScript), sibling folder `../backend-part`. `services/` in this app becomes `fetch` calls to its API.
  - Update: for now the BE is plain JavaScript (ESM), using Node's built-in `http` module and the `pg` driver directly. No Express or TypeScript yet; both may come later.
- Database: SQL with an ORM. I know schemas, keys and joins but need a refresher, so show the generated SQL and explain relational concepts. Proposed, not yet confirmed: Drizzle + PostgreSQL. Hosting/Docker setup is undecided, don't assume it.
  - Update: PostgreSQL 16 is confirmed and running locally. Currently using raw `pg` (Pool), no ORM yet. Docker deferred.
- Planned BE layering (when Express + ORM come in): route (URL + method to controller) > controller (HTTP only: read `req`, call the service, write `res`; this is the "handler") > service (business rules, e.g. `auth.service.js`) > data access (ORM queries, replaces hand-written SQL in services). Next.js is not a layer here, it is the client calling the routes. The auth guard becomes Express middleware, error handling becomes one error middleware.
- Mini test before migrating to Express (I answer, Claude only checks): name 3 pieces of hand-written code in `server.js` that Express makes redundant.
- Next focus: authentication (login first, then sessions, route protection). Auth flow: backend verifies credentials and issues the token/session, Next.js keeps it in an httpOnly cookie.

# Local database setup (current)

- Postgres is started manually with `pg_ctl` (not `brew services`, not Docker).
- Data folder: `../db/db/pgdata` (nested `db/db` by accident; may be tidied to `db/pgdata`).
- Initialized with `initdb --locale=C -E UTF8`. Starting needs `LC_ALL=en_US.UTF-8`, otherwise the server fails on macOS.
- Auth: local "trust" (user `boha1704`, no password). Port 5432.
- Database: `practice` (created by `initDb()` if missing). Tables are created with `CREATE TABLE IF NOT EXISTS` in `db.js`:
  - `users`: `id SERIAL PK`, `username TEXT UNIQUE NOT NULL` (constraint `users_username_unique`; it holds the email the user types at signup/login, there is no separate `email` column), `password_hash TEXT NOT NULL` (`salt:hash`, scrypt), `login_count INTEGER NOT NULL DEFAULT 0`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - `sessions`: `id TEXT PK` (random 64-hex opaque session ID), `user_id INTEGER NOT NULL` (FK to `users(id)`, `ON DELETE CASCADE`), `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Relation: one user has many sessions (1:N). Deleting a user deletes their sessions. Expired rows are not cleaned up yet.
- `backend-part/package.json` scripts:
  - `db:start`: `LC_ALL=en_US.UTF-8 pg_ctl -D ../db/db/pgdata -l ../db/logfile start`
  - `db:stop`: `pg_ctl -D ../db/db/pgdata stop`
  - `dev`: starts Postgres if `pg_isready` fails, then `node --watch server.js`
- Postgres keeps running after the terminal closes; stop it with `pnpm db:stop`.
- BE: `db.js` (Pool, `initDb()` creating the DB and both tables if missing) and `server.js` (raw `http`, routes auth endpoints behind the guard, other requests return 404).

# Where I am (knowledge)

Covered so far:

- Node basics: V8 + built-in modules (`http`, `fs`, `net`), minimal server, `req`/`res`, `writeHead`/`write`/`end`, why a missing `end()` hangs the client.
- Networking: TCP connection and handshake, keep-alive, `net` (raw TCP, own protocol) vs `http`, WebSocket as its own protocol starting with an HTTP upgrade, OSI layers (when they apply and when not).
- Database: DB server as a separate program on a port; SQL is the language and Postgres runs it; server > database > schema > table; constraints vs columns; `psql` basics (`\d`, `\q`, `;`, `=#` vs `-#` prompt); TablePlus is only a client.
- Node + DB: `Client` vs `Pool`, module caching acts as a singleton, `$1` placeholders against SQL injection, ESM vs CommonJS.
- Migrations: concept understood (numbered SQL files plus a tracking table). Next step offered: write a tiny migration runner by hand before using a tool.

Notes:

- I prefer `psql` over the TablePlus GUI for checking structure.
- Docker concepts (image vs container, compose, service names as hosts) explained but not used yet.
