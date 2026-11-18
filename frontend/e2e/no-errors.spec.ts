import { test, expect, type Page } from "@playwright/test";

// Public pages that load without authentication
const PUBLIC_PAGES = [
  { path: "/", name: "Home" },
  { path: "/cadastro", name: "Cadastro" },
  { path: "/login?tipo=aluno", name: "Login Aluno" },
  { path: "/login?tipo=professor", name: "Login Professor" },
  { path: "/esqueci-senha", name: "Esqueci minha senha" },
  { path: "/redefinir-senha?token=abc", name: "Redefinir senha" },
];

// Only capture actual errors — warnings are common in Next.js dev mode
const CONSOLE_ERROR_TYPES = ["error"];

// Network responses that indicate a broken page
const FAILING_STATUS_CODES = [500, 502, 503, 504];

function collectErrors(page: Page) {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg) => {
    if (CONSOLE_ERROR_TYPES.includes(msg.type())) {
      // Ignore expected Next.js dev overlay noise
      const text = msg.text();
      if (text.includes("Download the React DevTools")) return;
      if (text.includes("ReactDOM.render is no longer supported")) return;
      consoleErrors.push(`[${msg.type()}] ${text}`);
    }
  });

  page.on("response", (response) => {
    if (
      FAILING_STATUS_CODES.includes(response.status()) &&
      !response.url().includes("/_next/")
    ) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  return { consoleErrors, networkErrors };
}

for (const { path, name } of PUBLIC_PAGES) {
  test(`"${name}" loads without console errors`, async ({ page }) => {
    const { consoleErrors } = collectErrors(page);

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(consoleErrors, `Console errors on ${path}:\n${consoleErrors.join("\n")}`).toHaveLength(0);
  });

  test(`"${name}" loads without failed network requests`, async ({ page }) => {
    const { networkErrors } = collectErrors(page);

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(networkErrors, `Network errors on ${path}:\n${networkErrors.join("\n")}`).toHaveLength(0);
  });

  test(`"${name}" returns HTTP 200`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
  });

  test(`"${name}" has no broken images`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src);
    });

    expect(
      brokenImages,
      `Broken images on ${path}:\n${brokenImages.join("\n")}`
    ).toHaveLength(0);
  });
}

test("old /home redirects permanently to /", async ({ page, request }) => {
  const resposta = await request.get("/home", { maxRedirects: 0 });
  expect(resposta.status()).toBe(308);
  expect(resposta.headers()["location"]).toBe("/");

  const { consoleErrors } = collectErrors(page);
  await page.goto("/home");
  expect(new URL(page.url()).pathname).toBe("/");
  expect(consoleErrors).toHaveLength(0);
});

test("home has one h1, a canonical URL, a share image and structured data", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveCount(1);
  // O título não se repete no HTML: só o texto para leitor de tela e o visível
  const h1 = (await page.locator("h1").textContent()) ?? "";
  expect(h1.split("Inglês do básico ao intermediário").length - 1).toBeLessThanOrEqual(2);

  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/^https?:\/\/[^/]+\/?$/);
  expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toContain("/video/fundo-poster.jpg");

  await expect(page.locator('link[rel="preload"][as="image"][href="/video/fundo-poster.jpg"]')).toHaveCount(1);

  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(jsonLd["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual(["EducationalOrganization", "Course"]);
});

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const texto = await robots.text();
  expect(texto).toContain("Disallow: /aluno");
  expect(texto).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/cadastro</loc>");
});

test("login is kept out of search results", async ({ page }) => {
  await page.goto("/login?tipo=aluno");
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  await expect(page).toHaveTitle("Entrar | Sweet Way English");
});

// proxy.ts: sem o cookie de sessão, as áreas logadas redirecionam no servidor (a página nem chega a renderizar)
for (const { path, tipo } of [
  { path: "/aluno/curso", tipo: "aluno" },
  { path: "/aluno", tipo: "aluno" },
  { path: "/professor/progresso", tipo: "professor" },
]) {
  test(`"${path}" without a session redirects to the login before rendering`, async ({ page }) => {
    const response = await page.goto(path);
    expect(new URL(page.url()).pathname).toBe("/login");
    expect(new URL(page.url()).searchParams.get("tipo")).toBe(tipo);
    // O documento recebido já é o login: o redirecionamento veio do servidor, não do JS da página
    expect(response?.request().redirectedFrom()?.url()).toContain(path);
  });
}
