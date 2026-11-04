# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Roadmap

The platform is evolving into a self-paced A1→B1 English course. The research and phased plan live in `docs/plano-plataforma-cursos.md`; section 1.3.1 holds the owner's decisions, which override the rest of the doc (v1 has no AI/speech, structured-grammar methodology first, American English, local hosting on SQLite).

## Overview

Sweet Way English is a full-stack English learning platform with two services:
- **Backend** (`/backend`): Express.js + TypeScript + Prisma (SQLite) — API on port `3333`
- **Frontend** (`/frontend`): Next.js 16 (App Router) + React 19 + Tailwind CSS 4 — UI on port `3000`

Each service has its own `CLAUDE.md` with detailed architecture notes. Read [backend/CLAUDE.md](backend/CLAUDE.md) and [frontend/CLAUDE.md](frontend/CLAUDE.md) when working within those directories.

## Running the Project

### With Docker (recommended)

```bash
# Copy and configure environment
cp .env.example .env

# Start both services
docker compose up --build
```

Backend health check: `GET http://localhost:3333/api/health`

### Without Docker

```bash
# Backend
cd backend && cp .env.example .env && npm install
npx prisma migrate dev
npm run db:seed
npm run dev        # http://localhost:3333

# Frontend (separate terminal)
cd frontend && npm install
npm run dev        # http://localhost:3000
```

> The backend `npm run dev` uses `tsx src/server.ts` directly — there is no file-watching/hot-reload. Restart manually after changes.

## Environment Variables

Root `.env` (used by Docker Compose):
```
JWT_SECRET=<required, min 16 chars>
APP_URL=http://localhost:3333
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3333
```

Backend `.env` also accepts:
```
DATABASE_URL=file:./prisma/dev.db
# Optional: JWT_EXPIRES_IN (7d), PORT (3333), UPLOAD_MAX_MB (10); see backend/.env.example
```

The frontend uses `NEXT_PUBLIC_API_URL` at build time to construct API calls. When running in Docker, this is passed as a build arg to the frontend image.

## Tests

```bash
# Backend (Vitest)
cd backend && npm test                              # Run all tests
cd backend && npm run test:watch                    # Watch mode
cd backend && npm run test:coverage                 # Coverage report
cd backend && npx vitest run path/to/test.ts        # Single test file

# Frontend (Jest + Playwright)
cd frontend && npm test                             # Jest unit tests
cd frontend && npx jest path/to/test.tsx            # Single Jest test file
cd frontend && npm run test:e2e                     # Playwright E2E (requires running frontend)
cd frontend && npx playwright test e2e/no-errors    # Single Playwright spec
```

Backend tests live in `src/__tests__/unit/` (controllers, middleware) and `src/__tests__/integration/`. The `src/__tests__/helpers/mockReqRes.ts` helper provides `mockReq()`, `mockRes()`, and `studentReq()` for controller unit tests — all controllers are tested by mocking `req`/`res` directly, not by mounting Express.

Frontend Jest unit tests don't exist yet (`--passWithNoTests`). Playwright has two specs: `frontend/e2e/no-errors.spec.ts` (public pages, the default `npm run test:e2e`) and `frontend/e2e/curso.spec.ts` (full course flow for student and teacher, only with `E2E_CURSO=1` against a seeded backend; see `frontend/CLAUDE.md`).

## Seed Credentials

After running `npm run db:seed` (or first Docker start), these accounts are available:

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

1. `POST /api/auth/login` returns `{ token, user: { id, nome, email, role, admin } }` (JWT expires per `JWT_EXPIRES_IN`, default 7d)
2. Frontend stores both in `localStorage`
3. `apiFetch()` in `src/lib/api.ts` auto-injects `Authorization: Bearer <token>`
4. Backend `authenticateToken` middleware validates the JWT and attaches `req.user = { id, email, role, admin }`; on 401 the frontend `apiFetch` clears the stored session
5. `requireRole(...)` / `requireAdmin` middlewares gate endpoints (admin is checked against the DB); many older controllers still check `req.user.role` inline

`JWT_SECRET` is required (min 16 chars): the backend fails at startup without it, and `docker compose` refuses to start without it in the root `.env`.

### File Uploads

Multer stores files to `./uploads/{timestamp}-{sanitized-name}` on the backend (size limit `UPLOAD_MAX_MB`, MIME allowlist). The DB stores the relative path `/uploads/{filename}`, served statically at `GET /uploads/*`. The frontend uses `assetUrl(path)` from `src/lib/api.ts` to construct full URLs.

### Users

A single `Usuario` model with `papel: aluno | professor` and an `admin` boolean (admin is a privilege, not a role). bcryptjs (10 rounds). The JWT payload carries `role` (= `papel`) and `admin`. There is no public professor signup; admins create professors. Public student signup requires a birth date, plus guardian consent for minors (LGPD).

### Prisma Client

The Prisma client is generated to a non-standard path: `src/database/generated/prisma`. Import it from there, not from `@prisma/client`:

```typescript
import { PrismaClient } from '../database/generated/prisma/index.js';
```

After any `schema.prisma` change: `npx prisma migrate dev` then `npx prisma generate`.
