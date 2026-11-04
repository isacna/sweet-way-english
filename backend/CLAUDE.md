# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev        # Start server with tsx (hot reload via tsx watch if needed)
npm run lint       # Type-check with tsc --noEmit

# Database
npx prisma migrate dev     # Apply migrations and regenerate client
npx prisma generate        # Regenerate Prisma client after schema changes
npm run db:seed            # Seed the database (prisma/seed.ts)
npx prisma studio          # Open Prisma GUI

# Build
npm run build              # prisma generate + vite build
```

Tests run with Vitest. Unit tests are in `src/__tests__/unit/`, integration tests in `src/__tests__/integration/`.

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## Environment

Copy `.env.example` to `.env`. Env is validated with zod in `src/config/env.ts`: the server refuses to start if `JWT_SECRET` is missing or shorter than 16 chars. Other vars (all with defaults): `JWT_EXPIRES_IN` (7d), `PORT` (3333), `APP_URL`, `CORS_ORIGIN` (comma-separated, default `http://localhost:3000`), `UPLOAD_MAX_MB` (10), `DATABASE_URL`. Tests get `JWT_SECRET` from `vitest.config.ts`. Import `env` from `config/env.js` instead of reading `process.env`.

## Architecture

**Stack**: Express.js, TypeScript (ESM), Prisma ORM, SQLite (`prisma/dev.db`), Multer for file uploads, bcryptjs, jsonwebtoken, Zod.

### Entry Point

`src/app.ts` exports `createApp()` (helmet, CORS restricted to `CORS_ORIGIN`, JSON body, `/uploads` static, `/api` router, central `errorHandler`). `src/server.ts` only calls `createApp().listen(env.PORT)`. The integration test uses `createApp()` so it covers the real middleware stack.

### Route Organization

Routes are split into individual files under `src/http/routes/`, each with its own router, and assembled in `src/http/routes/index.ts`.

#### Auth — `auth.routes.ts` (public)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register/aluno` | Public signup, always creates an `aluno`; requires `dataNascimento`, and minors (<18) also need `responsavelNome`, `responsavelEmail`, `consentimentoResponsavel: true` (LGPD art. 14) |
| `POST` | `/api/auth/login` | Login (returns JWT + `user.admin`) |

There is no public professor signup: professors are created by an admin. Both auth routes are rate-limited (20 req / 15 min, skipped when `NODE_ENV=test`).

#### Classes — `class.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/turmas` | Create class (professor) |
| `GET` | `/api/turmas` | List classes for current user |
| `GET` | `/api/turmas/:id` | Class detail (activities, materials, avisos) |
| `POST` | `/api/turmas/entrar` | Student joins class via invite code |

#### Activities — `activity.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/turmas/:turmaId/atividades` | Create activity (professor) |
| `GET` | `/api/turmas/:turmaId/atividades` | List activities for a class |
| `PATCH` | `/api/professor/atividades/:id` | Update activity (professor) |

#### Avisos (Announcements) — `aviso.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/turmas/:turmaId/avisos` | List avisos for a class |
| `POST` | `/api/turmas/:turmaId/avisos` | Create aviso (professor) |
| `DELETE` | `/api/turmas/:turmaId/avisos/:avisoId` | Delete aviso (professor) |

#### Materials — `material.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/turmas/:id/materiais` | List materials for a class |
| `POST` | `/api/turmas/:id/materiais` | Upload material (multipart) |
| `DELETE` | `/api/turmas/:id/materiais/:materialId` | Delete material |

#### Submissions — `submission.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/atividades/:id/submissoes` | Submit assignment (student, multipart `arquivo`) |
| `GET` | `/api/atividades/:id/submissoes` | List submissions for activity |
| `PATCH` | `/api/professor/submissoes/:id` | Update submission status (professor) |

#### Feedback — `feedback.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/submissoes/:id/feedback` | Add feedback to a submission (professor) |
| `GET` | `/api/alunos/me/feedbacks` | List all feedbacks for current student |

#### Students — `student.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/professor/alunos` | List all students (professor) |
| `POST` | `/api/professor/alunos` | Create student (professor); optional `dataNascimento`, and for minors `responsavelNome`, `responsavelEmail`, `consentimentoResponsavel: true` are required |
| `PATCH` | `/api/professor/alunos/:id` | Update student (professor) |
| `DELETE` | `/api/professor/alunos/:id` | Delete student (professor) |

#### Config & Admin — `admin.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/configuracoes` | Get app configuration (public) |
| `PATCH` | `/api/configuracoes/logo` | Upload logo (multipart `logo`), admin |
| `GET` | `/api/professor/me` | Get professor profile, `requireRole('professor')` |
| `PATCH` | `/api/professor/me` | Update professor profile, `requireRole('professor')` |
| `GET` | `/api/admin/professores` | List all professors, admin |
| `POST` | `/api/admin/professores` | Create professor, admin |
| `PATCH` | `/api/admin/professores/:id` | Update professor, admin |
| `DELETE` | `/api/admin/professores/:id` | Delete professor and their classes, admin |
| `POST` | `/api/admin/alunos/:id/promover` | Change a student's `papel` to professor (keeps submissions, removes enrollments), admin |

#### Self-paced course (student) — `curso.routes.ts`, `requireRole('aluno')` on the whole router
Contract: `docs/api-curso.md`. Controller: `CursoController.ts`. Only `publicado` modules **and** lessons are visible.
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/curso` | Full trail with unlock state + profile (creates `PerfilAprendiz` on first call) |
| `GET` | `/api/curso/licoes/:id` | Lesson (presentation + public exercises); 404 unpublished, 403 locked |
| `POST` | `/api/curso/exercicios/:id/verificar` | Check a practice item (`{ resposta }`); wrong → review; no XP |
| `POST` | `/api/curso/licoes/:id/quiz` | Submit mini-quiz (`{ respostas }`); ≥80% completes the lesson |
| `GET` | `/api/curso/revisao` | Up to 20 due review items |
| `POST` | `/api/curso/revisao/:exercicioId` | Answer a review item (Leitner); 409 if not due yet |
| `POST` | `/api/curso/modulos/:id/teste` | Start (201) or resume (200) a module test attempt; 403/409/423 |
| `POST` | `/api/curso/tentativas/:id` | Finish an attempt (`{ respostas }`) |
| `PATCH` | `/api/curso/perfil` | `{ metodologia }` — only `gramatica` in v1 |

#### Course content (teacher) — `conteudo.routes.ts`, `requireRole('professor')`
Controllers: `ConteudoController.ts`, `ProgressoController.ts`. Content is global (any professor can review/publish).
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/conteudo` | Levels → modules → lessons with status and counts |
| `GET` | `/api/conteudo/licoes/:id` | Full lesson **with** answer keys |
| `PUT` | `/api/conteudo/licoes/:id` | Save lesson (`licaoEdicaoSchema`); exercises with `id` updated, without created, missing deleted |
| `PATCH` | `/api/conteudo/licoes/:id/status` | `{ status }`; publishing records `revisadoPorId`/`revisadoEm` |
| `PATCH` | `/api/conteudo/modulos/:id/status` | `{ status, incluirLicoes? }` |
| `GET` | `/api/conteudo/modulos/:id/teste` | Test items grouped by form (read-only) |
| `POST` | `/api/conteudo/exercicios/verificar` | Editor preview: `{ item, resposta }` → `corrigir()` |
| `GET` | `/api/professor/progresso?turmaId=` | Course progress of the professor's students |

Course code layout: pure rules in `src/domain/` (`correcao.ts` grading, `progresso.ts` thresholds/XP/Leitner/streak, `desbloqueio.ts` unlock rules and form rotation); Prisma helpers shared by the course controllers in `src/http/controllers/cursoApoio.ts` (`carregarTrilha`, `registrarEstudo`, `colocarNaRevisao`, `exercicioPublico`…). Never send `gabarito`/`explicacao`/`tagsErro` to a student before they answer — build responses with `exercicioPublico`/`itemTestePublico`. The course routers wrap controllers so async errors reach `errorHandler` (Express 4 does not catch rejected promises).

#### Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |

### Auth Middleware

Defined in `src/http/middlewares/auth.ts`:
- `authenticateToken`: verifies Bearer JWT, attaches `req.user = { id, email, role, admin }`. Returns 401 for invalid/expired tokens and for legacy tokens without `exp`.
- `requireRole(...papeis)`: 403 unless `req.user.role` is in the list.
- `requireAdmin`: checks `Usuario.admin` **in the database** (not the token claim), so revoking admin takes effect immediately.

Most older controllers still check `req.user.role` inline; the admin/config routes use the middlewares instead.

**Role values**: `"professor"` | `"aluno"`. Admin is a separate boolean, not a role.

### Database

Prisma with SQLite. Client initialized in `src/database/client.ts` using `@prisma/adapter-better-sqlite3`.

**Key models**:
- `Usuario`: single user table with `papel` enum (`aluno | professor`) and `admin` boolean; passwords hashed with bcryptjs (10 rounds). Stores `dataNascimento` and guardian-consent fields for minors. Relations keep the old names (`Turma.professor`, `Matricula.aluno`, `Submissao.aluno`, `Feedback.professor`), all pointing to `Usuario`. Migration `20261103000000_usuario_unificado` merged the old `Professor`/`Aluno` tables (student ids were offset by the max professor id).
- `Turma` — class with a random 6-char `codigoConvite` (invite code)
- `Matricula` — join table between a `Usuario` (aluno) and a `Turma`
- `Atividade` — assignment belonging to a `Turma`, has `arquivoObrigatorio` (bool) and `prazo` (deadline)
- `Submissao` — student submission; `status` enum: `pendente | aprovado | reprovado | corrigido`
- `Feedback` — one-to-one with `Submissao`; has `nota` (grade) and `comentario`
- `MaterialApoio` — resource attached to a `Turma`; `tipo` enum: `pdf | audio | video | link`
- Course (Phase 1): `Nivel` → `Modulo` → `Licao` → `Exercicio` (PPP stages), `ItemTeste` (parallel forms per module), and learner state `PerfilAprendiz`, `ProgressoLicao`, `RevisaoItem` (Leitner), `TentativaTeste`. `Modulo`/`Licao` have `status: rascunho | revisao | publicado`.

After any `schema.prisma` change, run `npx prisma migrate dev` then `npx prisma generate`.

### File Uploads

Multer (`src/config/multer.ts`) stores files to `./uploads/{timestamp}-{sanitized-name}`, max `UPLOAD_MAX_MB` (413 above it), allowlisted MIME types only: PDF, Office docs, plain text, images (no SVG), audio, video (415 otherwise). The stored URL in the DB is `/uploads/{filename}`, served statically at the same path. File fields:
- `submissoes`: field name `arquivo`
- `materiais`: field name `arquivo`
