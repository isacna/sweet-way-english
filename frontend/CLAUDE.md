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
6. Checks the session: the `sw_sessao` cookie is httpOnly and there is no `token` in `localStorage`. "Sair da conta" removes the cookie. A cached `user` without a cookie goes back to the login.
7. Opens "Esqueci minha senha" and submits it, then submits `/redefinir-senha` with an invalid token and expects the error. The full reset flow is covered by the backend tests (`npm run test:db`).

Each test fails on any console error or any API response ≥ 400, except the expected 400 in step 7. Answer keys come from the teacher endpoints. API calls in the spec use `Authorization: Bearer`, and the backend prefers that header over the cookie.

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
- `/esqueci-senha` — e-mail form (`POST /auth/esqueci-senha`), always shows the same generic success message; linked from the login page ("Esqueci minha senha")
- `/redefinir-senha?token=` — new password + confirmation (`POST /auth/redefinir-senha`, min 6); success links to the login, an expired/used link offers a new one. Its `layout.tsx` sets `referrer: no-referrer` and `noindex` because the token is in the URL

### Self-paced course (student side)

Contract: `docs/api-curso.md`. Types and helpers (`proximoPasso`, `respostaPreenchida`, `respostaParaEnvio`, `formatarResposta`, `lerErroApi`, thresholds) in `src/lib/curso.ts`.
- `/aluno/curso` — trilha (`GET /curso`): XP, ofensiva, revisões pendentes, methodology card, levels → modules (accordion, `#modulo-<id>` opens one) → lessons + module-test button
- `/aluno/curso/licao/[id]` — lesson player (`components/curso/PlayerLicao.tsx`), PPP: apresentação → prática (controlada → semicontrolada → produção, each checked via `/verificar`) → mini-quiz (sent all at once) → result. Two columns on `lg` (lesson + sticky "Minhas notas" aside); below `lg` the notes open as a bottom sheet. Notes (`PainelNotas.tsx`, `useNotaLicao`) autosave via `PUT /curso/licoes/:id/nota`; "Anotar" buttons on rules/examples append a line. In-lesson progress (phase, practice answers/feedback and position, quiz answers) is kept in `localStorage` (`src/lib/rascunhoLicao.ts`, key `sw-licao:<userId>:<licaoId>`) so a reload resumes; cleared when the quiz is submitted
- Presentation emphasis (`TextoDestacado.tsx`): English terms from `vocabulario` and the left side of `regras` ("EN = PT") are highlighted in the explanation and play TTS on click; `*asterisks*` in content mark terms explicitly, and after "não diga" they render as a struck-through wrong form (no audio)
- `/aluno/curso/revisao` — Leitner review session (`GET/POST /curso/revisao`)
- `/aluno/curso/modulo/[id]/teste` — module test: intro/rules → `POST /curso/modulos/:id/teste` (409/423/403 handled) → items grouped by skill → `POST /curso/tentativas/:id` → per-skill result
- `components/curso/` — `Exercicio` dispatches to one renderer per `tipo` (`ExercicioMcq`, `ExercicioCloze`, `ExercicioWordOrder`, `ExercicioMatch`, `ExercicioTexto`), all sharing `PropsRenderizador` (`value`/`onChange`/`disabled`/`feedback`/`onSubmit`); `FeedbackResultado`, `ui.tsx` (progress bar, loading/notice, `classeBotao`), `ContinuarCursoCard` (dashboard card)
- Course pages use the `grape` token; dynamic pages read the id with `useParams` and key an inner component by it so state resets on navigation
- `/home` — Landing page; `/` redirects here

### Auth Flow

The session is the httpOnly cookie `sw_sessao`, set by the backend on login. JS cannot read it. The login page stores only `user` (JSON) in `localStorage` via `salvarUsuario()`, as a UI cache. Helpers in `src/lib/api.ts`:
- `getStoredUser()` reads the cache.
- `limparUsuario()` clears it.
- `validarSessao()` calls `GET /auth/me`: it refreshes the cache, returns `null` on 401, and keeps the cache on other errors.
- `sair()` calls `POST /auth/logout` and clears the cache.

The helpers also drop a legacy `token` key. The class-management pages (`/aluno/*`, `/professor/*` outside the course) no longer have per-page `getStoredUser()` redirect guards (F3 moves route protection to `proxy.ts`); they only redirect when the API answers 401, and use the cached user for display only. `NavbarUser`, rendered in the aluno and professor layouts, calls `validarSessao()` on mount and redirects to the login when the cookie is gone or was revoked (password changed). Any 401 from `apiFetch` also clears the cache. There is no centralized auth context or middleware yet (F3 plans a `proxy.ts`).

### API Layer (`src/lib/api.ts`)

All backend calls go through `apiFetch(path, init?)`:
- Prepends `NEXT_PUBLIC_API_URL` + `/api` to the path (e.g., `apiFetch("/turmas")` → `http://localhost:3333/api/turmas`)
- Sends `credentials: "include"` so the session cookie goes along. It never sets `Authorization`. On 401 it clears the cached `user`
- Sets `Content-Type: application/json` for non-FormData bodies (omits it for file uploads so the browser sets the multipart boundary)
- Returns the raw `Response` — callers check `res.ok` and call `res.json()` themselves

Named path constants live in `apiPaths` (only a few so far; most paths are inline strings).

### Private files (`src/lib/arquivos.ts`)

Uploads (submissions, materials, activity attachments) are private. The API returns `arquivoUrl` / `urlArquivo` = `"/api/arquivos/<id>"` and `arquivo: { id, nomeOriginal, mime, tamanho }`. Link materials keep their external URL in `urlArquivo`. Never put an API file URL in `<img>`/`<a href>`. Fetch it with the session instead:
- `useArquivoUrl(url, ativo)` returns `{ src, carregando, erro }`. A private URL is fetched through `apiFetch` into a `blob:` object URL, which is revoked on unmount or change. An external URL comes back unchanged.
- `abrirArquivo(url, { nome, baixar })` opens the file in a new tab (the tab is opened before the fetch, so pop-up blockers allow it) or downloads it.
- `<ArquivoBotao url nome baixar>` is a button for private files and a plain link for external ones. It shows the error (404 = no permission).
- `<AssetPreview url arquivo tipo title>` shows "Ver aqui" (toggles an inline preview that only downloads once opened) and "Abrir em nova aba" / "Baixar". The kind comes from `arquivo.mime`: image, native PDF `<iframe>` on the blob URL, `<video>`, `<audio>`. Office docs and text get a download button. There is no Google Docs viewer, and external PDFs open in a new tab. YouTube links are embedded.

`assetUrl()` in `api.ts` has no callers left. The logo URL from `GET /configuracoes` is already absolute and public.

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
- `accent` is violet everywhere (sky blue only for the audio button). Dark theme: the tokens are redefined under `[data-tema="escuro"]` (public video screens), `[data-area="aluno"]` (student area, unless the viewer picks "claro") and `html[data-preferencia-tema="escuro"]` (`src/lib/tema.ts`); teacher area is light by default. Use tokens, not `bg-white`/palette colors, or the dark theme breaks
- Font: Inter (`--font-sans` and `--font-display`), via `next/font` on `<html>` in `app/layout.tsx`; the public screens (`components/publico/HeroVideo.tsx`, `AuthShell`) use CSS modules
- Helpers: `.card`, `.eyebrow`, `.bg-cotton`, `.pb-safe`; icons from `lucide-react` (pinned)
- Course UI: `classeBotao` (3D buttons ≥ 48px) and `BarraAcao` (sticky bottom action bar) in `components/curso/ui.tsx`; form classes in `components/formStyles.ts`; login/cadastro share `AuthShell`
- Mobile: students get a bottom tab bar (`StudentNav variant="bottom"`, hidden on lesson/review/test focus screens); teachers get a scrollable tab strip under the header

### Class management (turmas)

Legacy area rebuilt in F3 on a shared kit. Pages stay thin; pieces live in:
- `components/painel/ui.tsx` — kit for both areas, tokens only: `Cabecalho` (back link, eyebrow, title, actions that stack on phones), `Secao` (card section), `Campo` (label + hint + opcional/obrigatório), `CaixaMarcar`, `classeCampo` / `classeArquivo` / `classeRotulo`, `classeBotao("primario" | "secundario" | "perigo" | "perigoContorno" | "fantasma")` and `classeLinkAcao` (all ≥ 44px), `Mensagem` (role alert/status), `RegiaoAoVivo` (always-mounted aria-live region for async results), `Vazio`, `Carregando`, `Selo`, `Avatar`, `erroDaApi(res | null, padrao)` (reads `{error}`; `null` = no connection, use `apiFetch(...).catch(() => null)`)
- `components/painel/Dialogo.tsx` — `Dialogo` (modal: focus trapped, Esc closes, focus returns to the opener, body scroll locked, bottom sheet on phones; `bloquearFechar` while a request runs), `AcoesDialogo`, `ConfirmarDialogo` (destructive confirmation; focus starts on Cancelar; shows the API error inside). Never use `alert()`/`confirm()`
- `components/turmas/` — `tipos.ts` (API shapes), `status.ts` (`seloEntregaProfessora`, `situacaoAluno`, `podeEnviar`, `prazo`, `dataHoraCurta`), `CodigoConvite` (copy button, compact variant), `MuralAvisos` (teacher: create in a dialog, delete with confirmation; student: read-only; only http(s) links become `<a>`), `CamposAtividade` (+ `validarAtividade`, `corpoAtividade`: JSON, or multipart when there is an attachment), `PainelAtividade` (teacher activity detail: delivery progress, who is missing, submissions grouped per student with older attempts collapsed, edit form with attachment replace/remove), `CartaoEntrega` (grade with nota+comentário, or Aprovar / "Pedir nova entrega" with confirmation; also exports `ConteudoEntrega`, `CaixaFeedback` used by the student page), `Materiais` (`ItemMaterial`, `FiltrosMateriais`, `TIPOS_MATERIAL`), `DialogoNovoMaterial` (Arquivo | Link)
- `components/alunos/DialogosAluno.tsx` — create (minor → guardian + consent) and edit student dialogs
- `components/configuracoes/` — `SecaoConta` (own profile/password; refreshes the cached user), `SecaoLogo` (admin; shows the logo by its relative `/api/configuracoes/logo` path), `SecaoProfessores` (admin: create/edit/delete, promote student)

Rules the backend enforces and the UI mirrors: a student is in one class at a time; a new submission only after a rejection (`reprovado`); `corrigido` (graded) can only be rejected, which deletes the grade; `aprovado`/`reprovado` are final. `/professor/turmas/[id]?atividade=<id>` opens the activity panel (the dashboard "Para corrigir" queue links there). Teacher and student pages use `accent` (violet); `sky` only for the audio material icon.

### Reusable Components

- `Button` — polymorphic (renders as `<button>` or `<Link>`), variants: `primary | secondary | ghost`, sizes: `sm | nav | md` (all ≥ 44px; tokens only). New pages prefer `classeBotao` from `components/painel/ui.tsx`
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
