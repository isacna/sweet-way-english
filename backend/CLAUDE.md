# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev        # Start server with tsx (no build, no file watching)
npm run lint       # Type-check with tsc --noEmit (strict mode)

# Database (PostgreSQL; DATABASE_URL in .env)
npx prisma migrate dev     # Create/apply migrations and regenerate client (development)
npx prisma migrate deploy  # Apply pending migrations (CI, Docker, production)
npx prisma generate        # Regenerate Prisma client after schema changes
npm run db:seed            # Seed the database (prisma/seed.ts)
npm run db:migrar-sqlite -- path/to/dev.db [--forcar]  # Copy an old SQLite DB into Postgres
npm run lembretes:enviar [-- --simular]                # Send today's study reminders (cron); --simular only lists them
npx prisma studio          # Open Prisma GUI

# Build and run compiled (what the Docker image does)
npm run build              # clean + prisma generate + tsc -p tsconfig.build.json + copy the Prisma client into dist/
npm start                  # node dist/server.js
```

Tests run with Vitest. Unit tests are in `src/__tests__/unit/`, integration tests in `src/__tests__/integration/`.

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:db           # src/__tests__/db/ against a real Postgres (TEST_DATABASE_URL)
```

`npm test` mocks Prisma and needs no database. `npm run test:db` uses `vitest.db.config.ts`. It skips everything when `TEST_DATABASE_URL` is unset. Otherwise its `globalSetup` **drops the `public` schema** of that database and runs `prisma migrate deploy`, so the database name must contain `test`. It covers mixed-case email login, the session cookie and password reset (`sessao-senha.test.ts`), the course trail, the lesson-note upsert, enum values, `onDelete` behaviour (Turma cascade, Restrict on a professor with classes, SetNull on the lesson reviewer) the SQLite→Postgres script, and private uploads (`arquivos.test.ts`: the `20261109010000_arquivos` migration of old rows, plus upload, permissions and file removal through the API).

## Environment

Copy `.env.example` to `.env`. Env is validated with zod in `src/config/env.ts`: the server refuses to start if `JWT_SECRET` is missing or shorter than 16 chars. Other vars (all with defaults): `JWT_EXPIRES_IN` (7d; also the cookie `maxAge`, so it must look like `7d`, `12h`, `30m` or plain seconds), `PORT` (3333), `APP_URL`, `CORS_ORIGIN` (comma-separated, default `http://localhost:3000`), `UPLOAD_MAX_MB` (10), `UPLOAD_DIR` (`uploads`), `DATABASE_URL`, `COOKIE_SECURE` (`1` adds `Secure` to the session cookie outside production; production always has it), `RESEND_API_KEY` (optional), `EMAIL_FROM` (default `Sweet Way English <onboarding@resend.dev>`), `FRONTEND_URL` (default `http://localhost:3000`, used in e-mailed links), `LOG_LEVEL` (`fatal|error|warn|info|debug|trace|silent`, default `info`; tests are always silent). `DATABASE_URL` is in the schema only so the server can warn at startup; `src/database/client.ts` reads `process.env` directly because the seed and scripts import it without the rest of the env. Tests get `JWT_SECRET` from `vitest.config.ts`. Import `env` from `config/env.js` instead of reading `process.env`.

## Architecture

**Stack**: Express.js, TypeScript (ESM, `strict`), Prisma ORM, PostgreSQL 17, Multer for file uploads, bcryptjs, jsonwebtoken, Zod, pino.

### Layers

```
routes       src/http/routes/*.routes.ts   authenticateToken + requireRole/requireAdmin, receberArquivo, h() (async errors → errorHandler)
controllers  src/http/controllers/*.ts     validar(schema, req.params | req.body) → service → response shape (comArquivo, materialPublico)
services     src/services/*.ts             Prisma + business rules; throw typed errors; know nothing about req/res
domain       src/domain/*.ts               pure rules (grading, progress, unlock, age, e-mail)
```

- **Services** (one per area): `turmas` (also `garantirAcessoTurma`/`turmaDaProfessora`, used by the others), `atividades`, `avisos`, `materiais`, `submissoes`, `feedbacks`, `alunos`, `professores`, `configuracao`. They take plain arguments (`usuario: UsuarioSessao`, ids, already-validated data) and return Prisma rows; the controller maps them to the API shape. An upload reaches a service as a `GravarAnexo` function built by `anexoDaRequisicao(req, donoId)`: the service calls it only after every check, so a rejected request never writes to disk, and the private-upload cleanup (`salvarArquivoRecebido`) is unchanged. The course controllers (`Curso`, `Conteudo`, `Progresso`) were not moved; they use `cursoApoio.ts` and `erroZod`.
- **Errors** (`src/services/erros.ts`): `ErroValidacao` 400, `ErroProibido` 403 (default message `Acesso negado`), `ErroNaoEncontrado` 404, `ErroConflito` 409, all subclasses of `ErroServico` (`status` + Portuguese message). `errorHandler` answers `{ error: message }`; it also maps multer (413/400), `TipoArquivoNaoPermitido` (415) and malformed JSON (400). Anything else is a 500 with `Erro interno do servidor`, logged with its stack. `ehErroPrisma(err, 'P2002')` recognises Prisma error codes (unique violations become the old 400 messages, other database errors are 500). The private files route keeps answering 404 instead of 403.
- **Validation** (`src/http/validacao.ts`): `validar(schema, valor)` throws `ErroValidacao` with the first issue's message (no field-path prefix, so the old messages stay as they were). Helpers: `id(msg)` for URL ids (digits only, 1..2147483647, otherwise 400), `idCorpo`, `texto`, `textoOpcional`, `booleano`/`lerBooleano` (JSON `true` or multipart `"true"/"1"/"on"`), `email`, `edicaoUsuarioSchema` (PATCH of a student or professor: each field optional but not empty when sent, empty password ignored, min 6), `SENHA_MIN`/`ERRO_SENHA`. Validation runs before any database access.
- **Controller tests** call controllers through `executar(handler, req, res)` (`__tests__/helpers/mockReqRes.ts`), which sends a thrown error through the real `errorHandler`. Role guards are tested over HTTP in `__tests__/integration/rotas-legadas.test.ts`.

### Logging

`src/config/logger.ts` exports `logger` (pino) and `criarLogger(destino?, nivel?)`. Level: `LOG_LEVEL` (default `info`), always `silent` under `NODE_ENV=test`. Output: `pino-pretty` in development when it is installed (it is a devDependency), JSON on stdout otherwise. `src/http/middlewares/log.ts` (`logRequisicoes`, the first middleware in `createApp`) is pino-http: one line per request with `reqId`, `req: { method, path }` (no query string), `res: { status }`, `duracaoMs`; level `info`, `warn` for 4xx, `error` for 5xx; `/api/health` is not logged (the monitor calls it every few seconds; a failing database check logs its own error). The request id is the incoming `X-Request-Id` when it matches `[A-Za-z0-9._:-]{1,128}`, otherwise a UUID, and it is sent back in `X-Request-Id`. No bodies, headers, cookies, IPs or user data are logged; `authorization`, `cookie`, `set-cookie`, `senha`, `token` and `password` paths are also redacted (`CAMPOS_OCULTOS`). In handlers use `req.log` (carries `reqId`) or `logger`; never `console.*` in `src/`. `log.error({ err }, 'mensagem')` logs the stack.

### Build and Docker

`tsconfig.json` is for type-checking (`noEmit`, `strict`, covers tests and scripts). `tsconfig.build.json` extends it with `module`/`moduleResolution: NodeNext`, `rootDir: src`, `outDir: dist`, source maps, and excludes `src/__tests__` and the generated client. `scripts/copiar-prisma-client.mjs` copies `src/database/generated` (CommonJS + wasm, not compiled by tsc) to `dist/database/generated`. Nothing else non-TS is needed at runtime: `prisma/conteudo` is read from the working directory by the seed/scripts only.

`Dockerfile` stages: `deps` (`npm ci`) → `build` (`npm run build`) → `prod-deps` (`npm ci --omit=dev`) → runtime on `node:24-alpine` with `NODE_ENV=production`: production `node_modules`, `dist/`, `prisma/` (schema, migrations, content), `seed-media/`, `prisma.config.ts`, and `src/` + `scripts/` for the tools that run with `tsx`. `prisma` (for `migrate deploy`) and `tsx` (for `prisma/seed.ts`, `conteudo:importar`, `conteudo:validar`) are production dependencies: the seed runs rarely, shares `src/` with the API, and compiling it would need a second output tree. In the image `src/database/generated` is a symlink to the client in `dist/`. Files belong to root; the process runs as `node` and can only write to `/app/uploads`. `entrypoint.sh`: checks that the uploads folder is writable (a volume created by an older image that ran as root needs a one-time `docker compose run --rm --user root --entrypoint chown backend -R node:node /app/uploads`), runs `prisma migrate deploy`, seeds when `SEED_ON_START=1`, then `exec node dist/server.js`.

### Entry Point

`src/app.ts` exports `createApp()` (request logging with `X-Request-Id`, helmet, CORS restricted to `CORS_ORIGIN` with `credentials: true`, `cookie-parser`, JSON body, `/api` router (nothing is served statically: uploads go through `GET /api/arquivos/:id`), central `errorHandler`). `src/server.ts` registers the `unhandledRejection`/`uncaughtException` handlers (logged), warns when `DATABASE_URL` is missing, calls `avisarConfigEmail()` (warns when `RESEND_API_KEY` is missing) and `createApp().listen(env.PORT)`. The integration test uses `createApp()` so it covers the real middleware stack.

### Route Organization

Routes are split into individual files under `src/http/routes/`, each with its own router, and assembled in `src/http/routes/index.ts`. Every legacy route declares its roles with `requireRole(...)` (or `requireAdmin`): a wrong role gets `403 { error: 'Acesso negado' }` before any query or upload parsing. Routes open to both roles still list them (`requireRole('professor', 'aluno')`); the service then checks ownership/enrollment. URL ids that are not positive integers get 400.

#### Auth — `auth.routes.ts` (public)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register/aluno` | Public signup, always creates an `aluno`; requires `dataNascimento`, and minors (<18) also need `responsavelNome`, `responsavelEmail`, `consentimentoResponsavel: true` (LGPD art. 14) |
| `POST` | `/api/auth/login` | Login: sets the `sw_sessao` cookie and returns `{ token, user }` (`token` only for API clients) |
| `POST` | `/api/auth/logout` | Clears the session cookie (no auth needed) |
| `GET` | `/api/auth/me` | `{ user }` of the current session, same shape as login; 401 without a valid session |
| `POST` | `/api/auth/esqueci-senha` | `{ email }` → always 200 with the same message; e-mails a reset link if the account exists |
| `POST` | `/api/auth/redefinir-senha` | `{ token, senha }` (min 6) → 200, or 400 for an unknown/expired/used link |

There is no public professor signup: professors are created by an admin. Signup, login and `redefinir-senha` are rate-limited (20 req / 15 min per IP), `esqueci-senha` more strictly (5 / 15 min per IP); all limiters are skipped when `NODE_ENV=test`.

#### Classes — `class.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/turmas` | Create class (professor). `{ nome, descricao? }`; the invite code is 8 random chars from `turmas.gerarCodigoConvite()` (no 0/O/1/I/L) |
| `GET` | `/api/turmas` | List classes for current user |
| `GET` | `/api/turmas/:id` | Class detail (activities, materials, students); owner professor or enrolled student. Students get classmates' `nome` only, no `email` |
| `POST` | `/api/turmas/entrar` | Student joins class via invite code (aluno; one class per student; the code is uppercased) |

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
| `GET` | `/api/atividades/:id/submissoes` | List submissions for activity (professor) |
| `PATCH` | `/api/professor/submissoes/:id` | Update submission status (professor) |

#### Feedback — `feedback.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/submissoes/:id/feedback` | Add feedback to a submission (professor): `{ comentario, nota }` (number ≥ 0, JSON number or numeric string); marks it `corrigido` in the same transaction |
| `GET` | `/api/alunos/me/feedbacks` | List all feedbacks for current student (aluno) |

#### Students — `student.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/professor/alunos` | List all students (professor) |
| `POST` | `/api/professor/alunos` | Create student (professor): `nome`, valid `email`, `senha` (min 6), `turmaId` of one of their classes; optional `dataNascimento`, and for minors `responsavelNome`, `responsavelEmail`, `consentimentoResponsavel: true` are required |
| `PATCH` | `/api/professor/alunos/:id` | Update student (professor): `nome`/`email` not empty when sent, `senha` ignored when empty, otherwise min 6 |
| `DELETE` | `/api/professor/alunos/:id` | Delete student (professor) |

#### Config & Admin — `admin.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/configuracoes` | Get app configuration (public) |
| `GET` | `/api/configuracoes/logo` | The school logo (public; the only public upload). `GET /api/configuracoes` returns `logoUrl` = this absolute URL with `?v=<timestamp>` |
| `PATCH` | `/api/configuracoes/logo` | Upload logo (multipart `logo`, PNG/JPEG/GIF/WebP checked by bytes), admin |
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
| `POST` | `/api/curso/modulos/:id/teste` | Start (201) or resume (200) a module test attempt; optional `{ adiantar: true }` skips the "all lessons done" check (test-out); 403/409/423 |
| `POST` | `/api/curso/tentativas/:id` | Finish an attempt (`{ respostas }`) |
| `PATCH` | `/api/curso/perfil` | `{ metodologia?, metaDiariaXp?, onboardingConcluido?, lembretesEmail? }` — only `gramatica` in v1; daily goal is 10, 30 or 60 XP; `onboardingConcluido: true` ends the welcome flow; `lembretesEmail` turns the e-mail study reminders on or off (opt-in) |
| `GET` | `/api/curso/conquistas` | Achievements derived from progress (`domain/conquistas.ts`); nothing is stored |
| `GET` | `/api/curso/certificados` | Per level: completion and certificate; issues the `Certificado` row the first time the level is complete |

#### Certificates (public) — `certificado.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/certificados/:codigo` | Public check of a level certificate: `{ nomeAluno, nivel, emitidoEm }` or 404. Rate-limited (60 req / 15 min per IP, skipped when `NODE_ENV=test`) |

Controller: `ConquistasController.ts` (`getConquistas`, `getCertificados`, `verificarCertificado`). Achievements are computed by `calcularConquistas()` from the profile and `carregarTrilha()` (published content only). A level is complete when every published module has a passed test (`nivelConcluido`). `getCertificados` inserts with `createMany` + `skipDuplicates` and draws another 12-char code (`gerarCodigoCertificado`, no 0/O/1/I/L) if the insert was skipped. An issued certificate is never revoked by later publishing. The public endpoint returns only the name printed on the certificate, the level and the date.

#### Reminders — `lembrete.routes.ts` (public)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/lembretes/cancelar` | `{ token }` (or `?token=`) → turns `PerfilAprendiz.lembretesEmail` off; 200 with the same message for any valid token, 400 otherwise; rate-limited like the auth routes |

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
| `GET` | `/api/professor/progresso?turmaId=` | Course progress of the professor's students; `?turmaId=sem-turma` = students with no Matricula (any professor, pilot) |

Course code layout: pure rules in `src/domain/` (`correcao.ts` grading, `progresso.ts` thresholds/XP/Leitner/streak, `desbloqueio.ts` unlock rules and form rotation); Prisma helpers shared by the course controllers in `src/http/controllers/cursoApoio.ts` (`carregarTrilha`, `registrarEstudo`, `colocarNaRevisao`, `exercicioPublico`…). Answers (`resposta`, each value of `respostas`) are capped at 2000 chars of JSON (`respostaLimitada`) and a submission at 200 answers, because grading normalizes with regexes. Test-out ("adiantar"): `calcularTrilha` sets `podeAdiantar` (unlocked, not passed, lessons missing, not in the wait) and opens every lesson of an unlocked module whose test is passed; `licoesPermitemTeste` decides the 409 in `iniciarTeste`. Lessons are never marked completed by a test. `dictation` items are spoken by the browser, so `conteudo.frase` is public by design: `exercicioSchema` refuses the type in the `quiz` stage and `itemTesteSchema` refuses it in module tests, and grading returns the spoken sentence as `respostaEsperada`. `scripts/atualizar-pilotos.ts` (dry run by default, `--aplicar` to write) appends the pilot items tagged `piloto_multimidia_v1` / `piloto_ditado_v1` (`MODULOS_PILOTO` in `domain/conteudo/pilotos.ts`: a1-m01, a1-m02, a1-m04, a1-m06, a2-m02) to lessons already in the database without replacing the teacher's edits. Never send `gabarito`/`explicacao`/`tagsErro` to a student before they answer — build responses with `exercicioPublico`/`itemTestePublico`. The course routers wrap controllers so async errors reach `errorHandler` (Express 4 does not catch rejected promises).

#### Files — `arquivo.routes.ts`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/arquivos/:id` | Streams a private upload (authenticated). See "File Uploads" for who may see it; everyone else gets 404 |

#### Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |

### Auth

**Session** (`src/http/sessao.ts`): `iniciarSessao(res, usuario)` signs the JWT `{ id, email, role, admin, v }` (`v` = `Usuario.versaoToken`) and sets it in the cookie `sw_sessao` (`httpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production or with `COOKIE_SECURE=1`, `maxAge` = `JWT_EXPIRES_IN`). `encerrarSessao(res)` clears it. `usuarioPublico()` builds the `user` object returned by login and `/auth/me`. The frontend never sees the token: it calls the API with `credentials: 'include'`.

**Revoking sessions:** incrementing `Usuario.versaoToken` kills every token issued before. It is bumped on password reset, when an admin or professor sets someone's password (`professores.atualizarProfessor`, `alunos.atualizarAluno`), when a student is promoted to professor (the role is in the token), and when a professor changes their own password (`professores.atualizarPerfil`; `updateProfessorMe` then re-issues the cookie so the current session survives). Logout only clears the cookie.

**Password reset:** `esqueci-senha` creates a `TokenSenha` (only the SHA-256 of a random 32-byte token is stored, `expiraEm` = 1 h), deletes the user's previous unused tokens and e-mails `${FRONTEND_URL}/redefinir-senha?token=...` without awaiting the send (the response time does not reveal whether the account exists). `redefinir-senha` checks hash, expiry and `usadoEm`, then in one transaction marks the token used (conditional update, so a concurrent second request fails), sets the new password and bumps `versaoToken`. For minors the link goes to the account e-mail, like for any user (not to the guardian's).

**E-mail** (`src/email/`): `enviarEmail({ para, assunto, html, texto })`. With `RESEND_API_KEY` it POSTs to `https://api.resend.com/emails` with `fetch` (no SDK) from `EMAIL_FROM`; without it nothing is sent: outside production the console provider logs the message, link included (dev), and in production it only logs a warning without recipient or link (whoever reads the logs could otherwise reset someone's password). Templates are in `src/email/templates.ts` (Portuguese HTML + plain text). Tests mock `../email/index.js`.

**Study reminders** (opt-in, `PerfilAprendiz.lembretesEmail`, default false). Rules are pure functions in `src/domain/lembretes.ts`: `decidirLembrete(perfil, agora)` returns `ofensiva` (streak ≥ 2, studied yesterday, not today), `saudade` (last study exactly 3 or 7 days ago), `primeira-licao` (never studied, profile created 3 days ago) or `null`; days are counted in Brasília time; at most one per day (`ultimoLembreteEm`); only `papel = aluno`. `src/services/lembretes.ts` `enviarLembretes({ simular })` selects the candidates, reserves each profile by stamping `ultimoLembreteEm` with a conditional update before sending (a failed send undoes the stamp), and sends through `enviarEmail` with the `emailLembrete*` templates. In production without `RESEND_API_KEY` it sends and stamps nothing. There is no in-process timer: cron runs `npm run lembretes:enviar` once a day in the evening (`--simular` lists who would get what). Every reminder has an unsubscribe link `${FRONTEND_URL}/lembretes/cancelar?token=…` and `List-Unsubscribe` / `List-Unsubscribe-Post` headers (`Mensagem.cabecalhos`). The token is a JWT `{ tipo: 'cancelar-lembretes', id }` signed with `JWT_SECRET` (365 days); it has no `v`, so `authenticateToken` rejects it as a session.

**Middleware** (`src/http/middlewares/auth.ts`):
- `authenticateToken`: reads the JWT from `Authorization: Bearer` when present (API clients, tests, e2e), otherwise from the `sw_sessao` cookie (the browser). An explicit header wins so that an API client whose cookie jar holds another user's session still acts as the token it sent. Returns 401 for a missing, invalid or expired token, for legacy tokens without `exp` or `v`, and, after one lookup by id, when the user no longer exists or `versaoToken` differs from `v`. Attaches `req.user = { id, email, role, admin }`. It is async; database errors go to `next(err)`.
- `requireRole(...papeis)`: 403 unless `req.user.role` is in the list.
- `requireAdmin`: checks `Usuario.admin` **in the database** (not the token claim), so revoking admin takes effect immediately.

Every route uses these middlewares; controllers do not check `req.user.role` for access (services still branch on it where both roles see different data). `requireAdmin` passes database errors to `next()`.

**Role values**: `"professor"` | `"aluno"`. Admin is a separate boolean, not a role.

### Database

Prisma with PostgreSQL. The client lives in `src/database/client.ts` (`@prisma/adapter-pg`): `prisma` uses `DATABASE_URL`, and `criarPrisma(url)` builds a client for another URL (scripts, tests).

**Running locally:** you need a Postgres 17 server. For example:
`docker run -d --name sweetway-pg -p 5432:5432 -e POSTGRES_USER=sweetway -e POSTGRES_PASSWORD=sweetway -e POSTGRES_DB=sweetway postgres:17-alpine`.
Then set `DATABASE_URL=postgresql://sweetway:sweetway@localhost:5432/sweetway`, run `npx prisma migrate deploy` and `npm run db:seed`. In Docker Compose the `postgres` service is wired up for you, and the entrypoint runs `migrate deploy` on every start and seeds only when `SEED_ON_START=1`.

**Migrations:** `prisma/migrations/` starts with a single baseline, `20261108000000_base_postgres`, followed by `20261109000000_sessao_e_senha` (`Usuario.versaoToken`, `TokenSenha`). `20261111000000_meta_diaria_onboarding` adds `PerfilAprendiz.metaDiariaXp` / `xpDoDia` / `onboardingEm` (profiles that had already studied are marked as onboarded). `20261112000000_exercicio_dictation` adds the `dictation` exercise type and `20261112010000_lembretes_certificado` adds `PerfilAprendiz.lembretesEmail` / `ultimoLembreteEm` and the `Certificado` table. The 9 SQLite-era migrations are archived in `prisma/migrations-sqlite-arquivo/` (reference only, never applied).

**Moving data from SQLite** (`scripts/migrar-sqlite-para-postgres.ts`, logic in `scripts/migrar-sqlite/migrar.ts`):
```bash
DATABASE_URL=postgresql://... npx prisma migrate deploy        # target must be migrated
DATABASE_URL=postgresql://... npm run db:migrar-sqlite -- ./prisma/dev.db   # or SQLITE_PATH=...
```
The script opens the SQLite file read-only and copies every table in FK order inside one transaction. It keeps ids and then resets the sequences, lowercases emails (and aborts on case-insensitive duplicates) and validates enum values. It fills the new `criadoEm`/`atualizadoEm` columns from the row's existing dates, nulls a `revisadoPorId` that points to a missing user, and skips tables missing from the file (such as `NotaLicao` on older files). It refuses when the target already has users, unless you pass `--forcar`, which **truncates every table in the target** first. `better-sqlite3` is a devDependency used only by this script and its test.

**Conventions (F1 of `docs/plano-producao.md`):**
- Every FK column has an index, and every relation has an explicit `onDelete`. The children of a `Turma` (`Matricula`, `Aviso`, `Atividade` → `Submissao` → `Feedback`, `MaterialApoio`) cascade. Learner state cascades from `Usuario`. `Turma.professor` and `Feedback.professor` are `Restrict`, so deleting a professor still requires handling their classes and grades first (`professores.excluirProfessor` does that). `Licao.revisadoPor` is `SetNull`. The manual deletes in older controllers still work, and some are now redundant.
- Enums keep the API string values: `StatusMatricula` (`ativa | inativa`), `EtapaExercicio`, `TipoExercicio` (shared by `Exercicio` and `ItemTeste`), `HabilidadeTeste`, `TipoMaterial`, `Metodologia`. They match `ETAPAS`/`HABILIDADES_TESTE`/the item `tipo`s in `src/domain/conteudo/schema.ts`. Validate input before writing (for example, `MaterialController` returns 400 for an unknown `tipo`), because an invalid enum value is a Prisma error.
- Editable models have `criadoEm` + `atualizadoEm` (`@updatedAt`). `Json` columns are `jsonb`.
- `Usuario.email` is stored lowercase (unique index). Use `normalizarEmail()` from `src/domain/email.ts` on every write and lookup. Login does a single lookup.

**Key models**:
- `Usuario`: single user table with `papel` enum (`aluno | professor`) and `admin` boolean; passwords hashed with bcryptjs (10 rounds). `versaoToken` (Int, default 0) goes into the JWT as `v` (see Auth).
- `TokenSenha`: password-reset request (`hashToken` unique SHA-256, `expiraEm`, `usadoEm`), cascades from `Usuario`. Stores `dataNascimento` and guardian-consent fields for minors. Relations keep the old names (`Turma.professor`, `Matricula.aluno`, `Submissao.aluno`, `Feedback.professor`), all pointing to `Usuario`. The archived SQLite migration `20261103000000_usuario_unificado` merged the old `Professor`/`Aluno` tables (student ids were offset by the max professor id).
- `Turma` — class with a unique `codigoConvite` (invite code; new classes get 8 random chars, older ones keep `SW<nivel><n>-<year>`)
- `Matricula` — join table between a `Usuario` (aluno) and a `Turma`
- `Atividade` — assignment belonging to a `Turma`, has `arquivoObrigatorio` (bool) and `prazo` (deadline)
- `Submissao` — student submission; `status` enum: `pendente | aprovado | reprovado | corrigido`
- `Feedback` — one-to-one with `Submissao`; has `nota` (grade) and `comentario`
- `MaterialApoio` — resource attached to a `Turma`; `tipo` enum: `pdf | audio | video | link`. Either `url` (external link) or `arquivoId` (upload), never both (CHECK `MaterialApoio_url_ou_arquivo` in the migration)
- `Arquivo` — metadata of a private upload: uuid `id`, `donoId`, `nomeOriginal`, `caminho` (file name inside `UPLOAD_DIR`), `mime` (detected), `tamanho`. `Atividade.arquivoId` (teacher attachment), `Submissao.arquivoId` and `MaterialApoio.arquivoId` are nullable and unique. Both directions are `Restrict` (the owner, and the record pointing to the file), because the file on disk must go too: whoever deletes rows calls `apagarArquivos(tx, ids)` inside the transaction and `removerDoDisco(caminhos)` after the commit (`alunos.excluirAluno`, `professores.excluirProfessor`, `materiais.apagarMaterial`, `atividades.atualizarAtividade` in `src/services/`). A raw `prisma.turma.delete` leaves orphaned `Arquivo` rows (still visible only to their owner)
- `Certificado` — level certificate: unique public `codigo`, `usuarioId` (cascade), `nivelId` (restrict), `nomeAluno` as it was when issued, `emitidoEm`; one per student and level.
- `ConfiguracaoApp.logoCaminho` — logo file name inside `UPLOAD_DIR` (public, not an `Arquivo`)
- Course (Phase 1): `Nivel` → `Modulo` → `Licao` → `Exercicio` (PPP stages), `ItemTeste` (parallel forms per module), and learner state `PerfilAprendiz`, `ProgressoLicao`, `RevisaoItem` (Leitner), `TentativaTeste`. `PerfilAprendiz` also holds the daily goal: `metaDiariaXp` (`METAS_DIARIAS` in `domain/progresso.ts`) and `xpDoDia`, which only counts while `ultimoEstudoEm` is today in Brasília time (`xpDoDiaVigente`); `registrarEstudo` keeps it and sets `onboardingEm` on the first XP. `Modulo`/`Licao` have `status: rascunho | revisao | publicado`.

After any `schema.prisma` change, run `npx prisma migrate dev` then `npx prisma generate`.

### File Uploads

Private by default (F2 of `docs/plano-producao.md`). Code: `src/storage/arquivos.ts` (storage), `src/http/middlewares/upload.ts` (request side), `src/http/controllers/ArquivoController.ts` (download), `src/http/arquivoPublico.ts` (response shape).

**Receiving.** Routes use `receberArquivo(campo)`, never `upload.single`. Multer keeps the file in **memory** (one file, `UPLOAD_MAX_MB`, 413 above it). Then `detectarTipo` checks the bytes with `file-type`, and the declared MIME/extension is ignored. The allowlist is unchanged: PDF, docx/pptx, doc/ppt (the CFB container plus the declared type), images except SVG, audio, video, and plain text (only when declared as text, valid UTF-8, no NUL bytes). Anything else is 415, and the logo accepts only PNG/JPEG/GIF/WebP. The controller reads the file with `arquivoRecebido(req)`.

**Saving and cleanup.** Nothing touches the disk until everything is validated and `salvarArquivoRecebido(req, donoId, (tx, arquivo) => ...)` runs. Services get it as `anexoDaRequisicao(req, donoId)` (a `GravarAnexo`, or null without a file) and call it last. That function writes `UPLOAD_DIR/<uuid>.<ext>`, then in one transaction creates the `Arquivo` row and runs the callback that links it. If anything throws, the file is removed. A request the controller rejects (400/403/404) never writes, and memory storage made that choice. As a safety net, files written and not committed are removed when the response closes. Fields: `arquivo` for submissions, materials and activities (optional teacher attachment, JSON or multipart, `removerArquivo: true` on PATCH), and `logo` for the logo.

**Serving.** `GET /api/arquivos/:id` (uuid, authenticated) is allowed for:
- the owner;
- the teacher who owns the class the file belongs to (through `Atividade`, `Submissao` or `MaterialApoio`);
- students enrolled in that class, for activity attachments and materials;
- for a submission, only its student;
- admins (checked in the database).

Everyone else gets **404**, never 403. The response has `Content-Type` from the DB, `Content-Disposition: inline` (PDF, image, audio, video) or `attachment` (others) with `filename*=UTF-8''…`, `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-cache`.

**API contract.** Submissions and activities return `arquivoUrl: "/api/arquivos/<id>" | null` plus `arquivo: { id, nomeOriginal, mime, tamanho } | null`. Materials keep `urlArquivo`: `"/api/arquivos/<id>"` for uploads, the external URL for links. They also return `url` and `arquivo`.

**Migration `20261109010000_arquivos`.** It converted every old `"/uploads/<file>"` value into an `Arquivo` row. The owner is the student or the class teacher, the mime comes from the extension, `tamanho` is 0, and `caminho` is the old file name. Files on disk were not renamed. Values with `/` or `..` were dropped, the old columns were removed, and the logo became `logoCaminho`. Several migrated rows may share one `caminho`, so `apagarArquivos` only returns paths that no other row uses. The seed copies `seed-media/` into one random-named file per record. The SQLite import script (`db:migrar-sqlite`) maps the old columns the same way (`src/storage/legado.ts`).
