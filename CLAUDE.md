# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Roadmap

The platform is evolving into a self-paced A1→B1 English course. The research and phased plan live in `docs/plano-plataforma-cursos.md`; section 1.3.1 holds the owner's decisions, which override the rest of the doc (v1 has no AI/speech, structured-grammar methodology first, American English, local hosting on SQLite). For production, `docs/plano-producao.md` replaces the SQLite decision: VPS with Docker Compose and PostgreSQL (phase F1 moved the backend to Postgres).

## Overview

Sweet Way English is a full-stack English learning platform with two services:
- **Backend** (`/backend`): Express.js + TypeScript + Prisma (PostgreSQL 17) — API on port `3333`
- **Frontend** (`/frontend`): Next.js 16 (App Router) + React 19 + Tailwind CSS 4 — UI on port `3000`

Each service has its own `CLAUDE.md` with detailed architecture notes. Read [backend/CLAUDE.md](backend/CLAUDE.md) and [frontend/CLAUDE.md](frontend/CLAUDE.md) when working within those directories.

## Running the Project

### With Docker (recommended)

```bash
# Copy and configure environment (JWT_SECRET and POSTGRES_PASSWORD are required)
cp .env.example .env

# Start postgres, backend and frontend. Add SEED_ON_START=1 on the first start to run the seed.
docker compose up --build
```

Compose services: `postgres` (postgres:17-alpine, volume `pgdata`, healthcheck, no published port), `backend` (compiled image: waits for a healthy postgres, runs `prisma migrate deploy` on every start, seeds only when `SEED_ON_START=1`, then `node dist/server.js` as the non-root `node` user) and `frontend`. The only volumes are data volumes (`pgdata`, `uploads_data`); never mount anything over `/app/prisma`, since migrations and course content ship in the image.

Backend health check: `GET http://localhost:3333/api/health`

### Without Docker

Needs a PostgreSQL 17 server. A throwaway one: `docker run -d --name sweetway-pg -p 5432:5432 -e POSTGRES_USER=sweetway -e POSTGRES_PASSWORD=sweetway -e POSTGRES_DB=sweetway postgres:17-alpine`.

```bash
# Backend
cd backend && cp .env.example .env && npm install   # set DATABASE_URL=postgresql://...
npx prisma migrate deploy   # or `migrate dev` when changing the schema
npm run db:seed
npm run dev        # http://localhost:3333 (tsx, no build)
# Production-like: npm run build (tsc -> dist/) && npm start (node dist/server.js)

# Frontend (separate terminal)
cd frontend && npm install
npm run dev        # http://localhost:3000
```

> The backend `npm run dev` uses `tsx src/server.ts` directly — there is no file-watching/hot-reload. Restart manually after changes.

## Environment Variables

Root `.env` (used by Docker Compose):
```
JWT_SECRET=<required, min 16 chars>
POSTGRES_PASSWORD=<required>          # POSTGRES_DB / POSTGRES_USER default to sweetway
# DATABASE_URL=                       # optional; defaults to postgresql://USER:PASSWORD@postgres:5432/DB
APP_URL=http://localhost:3333
CORS_ORIGIN=http://localhost:3000        # only for direct calls to :3333 from another origin
SEED_ON_START=0                       # 1 = run the seed when the backend starts
LOG_LEVEL=info                        # backend logs (pino, JSON on stdout)
```

Backend `.env` also accepts:
```
DATABASE_URL=postgresql://sweetway:sweetway@localhost:5432/sweetway
# TEST_DATABASE_URL=...sweetway_test  # for npm run test:db (dropped on every run)
# Optional: JWT_EXPIRES_IN (7d), PORT (3333), UPLOAD_MAX_MB (10); see backend/.env.example
# E-mail / session: RESEND_API_KEY (no key = nothing is sent; outside production the message is logged), EMAIL_FROM, FRONTEND_URL (links in e-mails), COOKIE_SECURE
# LOG_LEVEL (info; pretty output in development, JSON otherwise, silent in tests)
```

The browser always calls the API on its own origin (`/api/...`); `NEXT_PUBLIC_API_URL` is no longer used. Next rewrites `/api/*` to `BACKEND_URL` (server-side only, default `http://localhost:3333`; see `frontend/.env.example`). The rewrite destination is fixed at `next build`, so in Docker `BACKEND_URL=http://backend:3333` is a build arg (set in `docker-compose.yml`) and also a runtime env for server components. In production Caddy (F4) will route `/api/*` straight to the backend. LAN/phone access works without config; `ALLOWED_DEV_ORIGINS` lists extra hosts for `next dev`.

## Tests

```bash
# Backend (Vitest)
cd backend && npm test                              # Run all tests
cd backend && npm run test:watch                    # Watch mode
cd backend && npm run test:coverage                 # Coverage report
cd backend && npx vitest run path/to/test.ts        # Single test file
cd backend && npm run test:db                       # Integration tests against real Postgres (needs TEST_DATABASE_URL)

# Frontend (Jest + Playwright)
cd frontend && npm test                             # Jest unit tests
cd frontend && npx jest path/to/test.tsx            # Single Jest test file
cd frontend && npm run test:e2e                     # Playwright E2E (requires running frontend)
cd frontend && npx playwright test e2e/no-errors    # Single Playwright spec
```

Backend tests live in `src/__tests__/unit/` (controllers, middleware) and `src/__tests__/integration/`. The `src/__tests__/helpers/mockReqRes.ts` helper provides `mockReq()`, `mockRes()`, and `studentReq()` for controller unit tests — all controllers are tested by mocking `req`/`res` directly, not by mounting Express. `src/__tests__/db/` holds the tests against a real Postgres (`npm run test:db`, config `vitest.db.config.ts`). They are skipped without `TEST_DATABASE_URL`, and they drop and re-migrate that database, so its name must contain `test`. CI runs them with a `postgres:17` service container.

Frontend Jest unit tests don't exist yet (`--passWithNoTests`). Playwright has two specs: `frontend/e2e/no-errors.spec.ts` (public pages, the default `npm run test:e2e`) and `frontend/e2e/curso.spec.ts` (full course flow for student and teacher, only with `E2E_CURSO=1` against a seeded backend; see `frontend/CLAUDE.md`).

## Seed Credentials

Outside production (`NODE_ENV` not `production`), `npm run db:seed` also creates demo data with these accounts. In production the demo data is skipped unless `SEED_DEMO=1`. The first admin then comes from `ADMIN_EMAIL` / `ADMIN_SENHA` (created only if missing). See `backend/.env.example`.

| Role      | Email                    | Password  |
|-----------|--------------------------|-----------|
| Professor (admin) | professor@sweetway.com   | senha123  |
| Student   | ana@email.com            | senha123  |
| Student   | bruno@email.com          | senha123  |
| Student   | carla@email.com          | senha123  |

## Self-paced course (Phase 1)

Self-paced A1 course using the Structured Grammar (PPP) method. It has no AI and no audio, and grading is deterministic. Plan: `docs/plano-plataforma-cursos.md` (section 9.1 says what was delivered). API contract: `docs/api-curso.md`.

- **Content** is versioned JSON in `backend/prisma/conteudo/` (`niveis.json`, `a1/m01.json`…`m10.json`): 10 modules × 6 lessons, plus 2 parallel test forms per module. The format is the zod schema in `backend/src/domain/conteudo/schema.ts`.
  - `cd backend && npm run conteudo:validar [-- m03]` checks the schema and the answer-key rules.
  - `npm run conteudo:importar` loads the content into the DB with status `revisao`. It is idempotent: existing lessons and tests are kept.
  - `-- --publicar` imports already published. `-- --sobrescrever` replaces lessons and tests, which **discards the teacher's edits**.
- **Seed** imports the course as `revisao`. With `SEED_PUBLICAR_CONTEUDO=1` it publishes it directly (demo or e2e).
- **Students only see** a module and a lesson when both are `publicado`. The teacher publishes them at `/professor/conteudo`.
- **Pages:**
  - Student: `/aluno/curso` (the trail), `/aluno/curso/licao/[id]`, `/aluno/curso/revisao`, `/aluno/curso/modulo/[id]/teste`, and public signup at `/cadastro`.
  - Teacher: `/professor/conteudo` (review and publish), `/professor/conteudo/licao/[id]` (editor), `/professor/conteudo/modulo/[id]/teste`, `/professor/progresso`.
- **Code:** rules live in `backend/src/domain/` (`correcao.ts`, `progresso.ts`, `desbloqueio.ts`). Controllers are `CursoController.ts`, `ConteudoController.ts` and `ProgressoController.ts`. Frontend components are in `frontend/src/components/curso/` (student) and `frontend/src/components/conteudo/` (teacher).

## Architecture Cross-Cutting Concerns

### Auth Flow (end-to-end)

1. `POST /api/auth/login` sets the JWT in the httpOnly cookie `sw_sessao` (SameSite=Lax, `Secure` in production or with `COOKIE_SECURE=1`, lifetime `JWT_EXPIRES_IN`, default 7d) and returns `{ token, user: { id, nome, email, role, admin } }`. `token` is only for API clients
2. The frontend stores only `user` in `localStorage`, as a UI cache. It never stores the token, and it removes a legacy `token` key on load
3. `apiFetch()` in `src/lib/api.ts` calls `/api` on the same origin (Next rewrite or Caddy) with `credentials: 'include'`, so the cookie is first-party. CORS (`CORS_ORIGIN` allowlist, with credentials) only matters for direct calls to port 3333. Before rendering `/aluno/*` and `/professor/*`, `frontend/src/proxy.ts` redirects to the login when the cookie is missing or expired and sends a user to their own area by the (decoded, unverified) JWT `role`
4. Backend `authenticateToken` reads `Authorization: Bearer` when present (API clients, tests, e2e), otherwise the cookie. It checks the JWT, then looks the user up by id. It returns 401 if the user was deleted or if `Usuario.versaoToken` differs from the token's `v`. It attaches `req.user = { id, email, role, admin }`. On any 401 the frontend `apiFetch` clears the cached `user`, and `NavbarUser` calls `GET /api/auth/me` on load to send a stale session back to the login
5. `POST /api/auth/logout` clears the cookie. A password change or reset bumps `versaoToken`, so every older session dies
6. `requireRole(...)` / `requireAdmin` middlewares gate every endpoint in the route files (admin is checked against the DB); controllers no longer check `req.user.role` for access

Password reset: `/esqueci-senha` → `POST /api/auth/esqueci-senha` always answers the same way and e-mails a 1-hour, single-use link `${FRONTEND_URL}/redefinir-senha?token=…`. Only the SHA-256 of the token is stored (`TokenSenha`). `/redefinir-senha` → `POST /api/auth/redefinir-senha`. E-mail goes through `backend/src/email/`: Resend when `RESEND_API_KEY` is set, otherwise the backend log in dev. Details in `backend/CLAUDE.md` ("Auth").

`JWT_SECRET` is required (min 16 chars): the backend fails at startup without it, and `docker compose` refuses to start without it in the root `.env`.

### File Uploads

Uploads are private. Multer keeps the file in memory (max `UPLOAD_MAX_MB`). The backend checks the real type from the file's bytes (`file-type`), and only then writes it to `UPLOAD_DIR` (default `./uploads`) under a random name (`<uuid>.<ext>`). Each file gets a row in the `Arquivo` table (owner, original name, mime, size), and `Atividade`/`Submissao`/`MaterialApoio` point to it with `arquivoId`. Nothing in `uploads/` is served statically. Files come only from `GET /api/arquivos/:id`, which needs a session and checks who may see the file (404 otherwise). The API keeps the old fields, `arquivoUrl` / `urlArquivo`, which now hold `"/api/arquivos/<id>"` (or the external URL for link materials), plus `arquivo: { id, nomeOriginal, mime, tamanho }`. The frontend fetches files with `apiFetch` and shows them through `blob:` URLs (`src/lib/arquivos.ts`). The school logo is the only public file: `GET /api/configuracoes/logo`. Details: `backend/CLAUDE.md` ("File Uploads").

### Users

A single `Usuario` model with `papel: aluno | professor` and an `admin` boolean (admin is a privilege, not a role). bcryptjs (10 rounds). The JWT payload carries `role` (= `papel`) and `admin`. There is no public professor signup; admins create professors. Public student signup requires a birth date, plus guardian consent for minors (LGPD).

### Backend layers

`routes` (auth + `requireRole`) → `controllers` (validate params/body with zod via `validar()`, call a service, shape the response) → `src/services/` (Prisma + business rules, throw `ErroValidacao`/`ErroProibido`/`ErroNaoEncontrado`/`ErroConflito`) → `src/domain/` (pure rules). The central `errorHandler` maps those errors to `{ error }` with 400/403/404/409. The course controllers (`Curso`/`Conteudo`/`Progresso`) keep their own helpers in `cursoApoio.ts`. Logs go through `src/config/logger.ts` (pino), never `console.*`. Details: `backend/CLAUDE.md`.

### Prisma Client

The Prisma client is generated to a non-standard path: `src/database/generated/prisma`. Import it from there, not from `@prisma/client`:

```typescript
import { PrismaClient } from '../database/generated/prisma/index.js';
```

After any `schema.prisma` change: `npx prisma migrate dev` then `npx prisma generate`.

The database is PostgreSQL (driver adapter `@prisma/adapter-pg`). Migrations start from a single baseline, `20261108000000_base_postgres`; the old SQLite migrations are archived in `backend/prisma/migrations-sqlite-arquivo/`. To bring data over from an old SQLite file, run `npm run db:migrar-sqlite -- path/to/dev.db` (see `backend/CLAUDE.md`). Emails are stored lowercase: normalize with `normalizarEmail()` from `src/domain/email.ts` before you write or look up a user.
