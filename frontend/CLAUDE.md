# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

Unit tests run with Jest (`jest-environment-jsdom`). E2E tests run with Playwright (Chromium).

```bash
npm test              # Jest unit tests
npm run test:ci       # Jest with coverage (CI mode)
npm run test:e2e      # Playwright E2E tests
npm run test:e2e:ui   # Playwright with interactive UI
```

`npm run test:e2e` runs only the public-page spec (`e2e/no-errors.spec.ts`, project `chromium`). The course spec `e2e/curso.spec.ts` lives in a separate project, `curso`, that only exists when `E2E_CURSO=1`. It needs a backend seeded with the course **published**, and must never point at the real `dev.db`: it creates a new student on every run.
- `BASE_URL`: an already running frontend; when it is set Playwright does not start `npm run dev`. Default `http://localhost:3000`.
- `API_URL`: the backend. Default `http://localhost:3333`.

The spec does these steps:
1. Signs up a minor through `/cadastro` and logs in through the UI.
2. Runs lesson 1: presentation, every practice item (all 6 renderer types) and the quiz at 100%.
3. Shows an empty review page.
4. Finishes lessons 2–6 through the API, then takes and passes the module test in the UI.
5. As the teacher, opens the content list, uses the editor ("Testar", then edit, save, reload and revert) and the test view, and opens `/professor/progresso`.

Each test fails on any console error or any API response ≥ 400. Answer keys come from the teacher endpoints.

```bash
# backend (from backend/), throwaway DB; NODE_ENV=test only disables the auth rate limit (20 req/15 min)
export DATABASE_URL=file:/tmp/e2e.db
npx prisma migrate deploy && SEED_PUBLICAR_CONTEUDO=1 npx tsx prisma/seed.ts
NODE_ENV=test PORT=3399 CORS_ORIGIN=http://localhost:3100 npx tsx src/server.ts
# frontend (from frontend/), another terminal
NEXT_PUBLIC_API_URL=http://localhost:3399 npx next dev -p 3100
# spec
BASE_URL=http://localhost:3100 API_URL=http://localhost:3399 E2E_CURSO=1 npx playwright test --project=curso
```

## Environment

Create `.env.local` to override the backend URL (defaults to `http://localhost:3333`):
```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## Architecture

**Stack**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4. No external state management library — all state is local React hooks + `localStorage`.

### Route Structure

Uses a `(main)` route group for shared layout. Two separate role-based areas:
- `/aluno/*` — Student dashboard, classes, activities, feedback, materials
- `/professor/*` — Teacher dashboard, class/activity management, grading, student management
- `/login?tipo=aluno|professor` — Auth entry point (`&cadastro=ok` shows the post-signup success message)
- `/cadastro` — Public student signup (`POST /auth/register/aluno`); under-18s must fill guardian name/email + LGPD consent

### Self-paced course (student side)

Contract: `docs/api-curso.md`. Types and helpers (`proximoPasso`, `respostaPreenchida`, `respostaParaEnvio`, `formatarResposta`, `lerErroApi`, thresholds) in `src/lib/curso.ts`.
- `/aluno/curso` — trilha (`GET /curso`): XP, ofensiva, revisões pendentes, methodology card, levels → modules (accordion, `#modulo-<id>` opens one) → lessons + module-test button
- `/aluno/curso/licao/[id]` — lesson player (`components/curso/PlayerLicao.tsx`), PPP: apresentação → prática (controlada → semicontrolada → produção, each checked via `/verificar`) → mini-quiz (sent all at once) → result
- `/aluno/curso/revisao` — Leitner review session (`GET/POST /curso/revisao`)
- `/aluno/curso/modulo/[id]/teste` — module test: intro/rules → `POST /curso/modulos/:id/teste` (409/423/403 handled) → items grouped by skill → `POST /curso/tentativas/:id` → per-skill result
- `components/curso/` — `Exercicio` dispatches to one renderer per `tipo` (`ExercicioMcq`, `ExercicioCloze`, `ExercicioWordOrder`, `ExercicioMatch`, `ExercicioTexto`), all sharing `PropsRenderizador` (`value`/`onChange`/`disabled`/`feedback`/`onSubmit`); `FeedbackResultado`, `ui.tsx` (progress bar, loading/notice, `classeBotao`), `ContinuarCursoCard` (dashboard card)
- Course pages use the `grape` token; dynamic pages read the id with `useParams` and key an inner component by it so state resets on navigation
- `/home` — Landing page; `/` redirects here

### Auth Flow

Login stores `token` and `user` (JSON) in `localStorage`. Each page/layout does its own `getStoredUser()` check in `useEffect` and redirects to `/login?tipo=...` if the user is missing or has the wrong role. There is no centralized auth context or middleware.

### API Layer (`src/lib/api.ts`)

All backend calls go through `apiFetch(path, init?)`:
- Prepends `NEXT_PUBLIC_API_URL` + `/api` to the path (e.g., `apiFetch("/turmas")` → `http://localhost:3333/api/turmas`)
- Automatically injects `Authorization: Bearer <token>` from `localStorage`
- Sets `Content-Type: application/json` for non-FormData bodies (omits it for file uploads so the browser sets the multipart boundary)
- Returns the raw `Response` — callers check `res.ok` and call `res.json()` themselves

Named path constants live in `apiPaths` (only a few so far; most paths are inline strings).

`assetUrl(path)` converts relative backend asset paths (e.g., `/uploads/file.jpg`) to full URLs for `<img>` and download links.

### Data Fetching Pattern

Pages fetch on mount using `useEffect` with a cancellation flag:
```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const res = await apiFetch("/some-path");
    if (cancelled) return;
    const data = await res.json();
    setState(data);
  })();
  return () => { cancelled = true; };
}, []);
```

Parallel requests use `Promise.all`. Batch state updates use `queueMicrotask`.

### Styling

Tailwind CSS v4 design tokens live in `src/styles/globals.css` (`@theme`, not inline) — use them instead of hex values:
- Text `ink` / `ink-soft` / `ink-faint`; surfaces `canvas`, `card`; borders `line` / `line-strong`
- `grape` (violet, student/course actions), `sky` (logo blue; audio buttons, teacher area), `candy` (pink highlights), `sun` (XP), `flame` (streak), `success` / `danger` (+ `-soft`, `-strong`, `-bright`, `-ink` variants)
- `accent` follows the area: violet by default, sky blue under `[data-area="professor"]` (set in the teacher layout)
- Fonts: Fredoka (`font-display`, headings/buttons) + Figtree (body), via `next/font` in `app/layout.tsx`
- Helpers: `.card`, `.eyebrow`, `.bg-cotton`, `.pb-safe`; icons from `lucide-react` (pinned)
- Course UI: `classeBotao` (3D buttons ≥ 48px) and `BarraAcao` (sticky bottom action bar) in `components/curso/ui.tsx`; form classes in `components/formStyles.ts`; login/cadastro share `AuthShell`
- Mobile: students get a bottom tab bar (`StudentNav variant="bottom"`, hidden on lesson/review/test focus screens); teachers get a scrollable tab strip under the header

### Reusable Components

- `Button` — polymorphic (renders as `<button>` or `<Link>`), variants: `primary | secondary | ghost`, sizes: `sm | nav | md`
- `Navbar` — top bar, variant `home | dashboard`
- `StudentNav` / `TeacherNav` — role navigation (header pills on desktop; bottom bar / tab strip on mobile)
- `NavbarUser` — avatar dropdown with logout

### Self-paced course (teacher side)

Contract: `docs/api-curso.md` ("Professora"). Extra response types in `src/components/conteudo/tipos.ts`.
- `/professor/conteudo` — review dashboard (`GET /conteudo`): levels → modules → lessons with status badges, "Mostrar só o que falta revisar" filter, "Publicar módulo inteiro" (`incluirLicoes: true`) / "Despublicar" with confirmation, quick lesson publish
- `/professor/conteudo/licao/[id]` — lesson editor/reviewer: form state lives in `components/conteudo/formulario.ts` (`LicaoForm`/`ExercicioForm`, all text; `licaoParaPayload` converts to `licaoEdicaoSchema`). Exercises are grouped by etapa and saved sorted by etapa; match pairs are entered as correct pairs and `montarMatch` derives a stable (hash-seeded) shuffled `direita` + `pares`. "Testar" posts the unsaved item to `/conteudo/exercicios/verificar`. Status buttons are disabled while there are unsaved changes; unsaved-change guard = `beforeunload` + capture-phase click listener on `<a>`
- `/professor/conteudo/modulo/[id]/teste` — read-only test forms with answer keys (`GabaritoView`)
- `/professor/progresso` — progress table (`GET /professor/progresso?turmaId=`), sticky name column, horizontal scroll on mobile
- Create-student form (`/professor/alunos`) sends optional `dataNascimento`; under 18 requires `responsavelNome`, `responsavelEmail`, `consentimentoResponsavel`
