import { defineConfig, devices } from "@playwright/test";

// BASE_URL: frontend já rodando (sem ele, o Playwright sobe `npm run dev` em :3000).
// E2E_CURSO=1 liga o projeto "curso" (e2e/curso.spec.ts), que precisa do backend com seed e curso publicado
// atrás do frontend (rewrite `/api` → BACKEND_URL). API_URL é opcional: por padrão é o próprio BASE_URL.
// Sem E2E_CURSO, `npm run test:e2e` roda só as páginas públicas. Ver frontend/CLAUDE.md.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const comCurso = process.env.E2E_CURSO === "1";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /curso\.spec\.ts/,
    },
    ...(comCurso
      ? [
          {
            name: "curso",
            use: { ...devices["Desktop Chrome"] },
            testMatch: /curso\.spec\.ts/,
            retries: 0, // os testes são em série e criam dados; repetir só confunde
          },
        ]
      : []),
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
