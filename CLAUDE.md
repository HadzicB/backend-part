# Project context

Learning project: Next.js fullstack app. Developed ad hoc, no fixed roadmap.
Backend is undecided: it may be Next.js route handlers/server actions, or a separate BE app. Don't assume either; ask before adding backend-specific code.
Current state: login boilerplate only. `services/auth/authService.ts` is a stub with a TODO for the real backend call.

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
- Next focus: authentication (login first, then sessions, route protection). Auth flow: backend verifies credentials and issues the token/session, Next.js keeps it in an httpOnly cookie.

# Local database setup (current)

- Postgres is started manually with `pg_ctl` (not `brew services`, not Docker).
- Data folder: `../db/db/pgdata` (nested `db/db` by accident; may be tidied to `db/pgdata`).
- Initialized with `initdb --locale=C -E UTF8`. Starting needs `LC_ALL=en_US.UTF-8`, otherwise the server fails on macOS.
- Auth: local "trust" (user `boha1704`, no password). Port 5432.
- Database: `practice`. Table `users`: `id SERIAL PK`, `username TEXT UNIQUE NOT NULL` (constraint `users_username_unique`), `password_hash TEXT NOT NULL`, `login_count INTEGER NOT NULL DEFAULT 0`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- `backend-part/package.json` scripts:
  - `db:start`: `LC_ALL=en_US.UTF-8 pg_ctl -D ../db/db/pgdata -l ../db/logfile start`
  - `db:stop`: `pg_ctl -D ../db/db/pgdata stop`
  - `dev`: starts Postgres if `pg_isready` fails, then `node --watch server.js`
- Postgres keeps running after the terminal closes; stop it with `pnpm db:stop`.
- BE drafted: `db.js` (Pool, `initDb()` creating the DB and the table if missing) and `server.js` (raw `http`, returns users as JSON).

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
