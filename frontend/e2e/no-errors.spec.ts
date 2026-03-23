import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

// Public pages that load without authentication
const PUBLIC_PAGES = [
  { path: "/home", name: "Home" },
  { path: "/login?tipo=aluno", name: "Login Aluno" },
  { path: "/login?tipo=professor", name: "Login Professor" },
];

// Error severities to capture from the browser console
const CONSOLE_ERROR_TYPES = ["error", "warning"];

// Network responses that indicate a broken page
const FAILING_STATUS_CODES = [500, 502, 503, 504];

function collectErrors(page: Page) {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
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

test("root / redirects to /home without errors", async ({ page }) => {
  const { consoleErrors } = collectErrors(page);

  await page.goto("/");
  await page.waitForURL("**/home");

  expect(page.url()).toContain("/home");
  expect(consoleErrors).toHaveLength(0);
});
