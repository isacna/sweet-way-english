import { test, expect, type Page, type APIRequestContext, type Locator } from "@playwright/test";

// E2E do curso autoguiado (Fase 1). Precisa de backend com o seed e o curso PUBLICADO:
//   DATABASE_URL=file:/tmp/e2e.db npx prisma migrate deploy
//   SEED_PUBLICAR_CONTEUDO=1 DATABASE_URL=file:/tmp/e2e.db npx tsx prisma/seed.ts
// Roda só no projeto "curso" do playwright.config.ts (E2E_CURSO=1). Ver frontend/CLAUDE.md.
//
// Cada execução cria um aluno novo pelo /cadastro (menor de idade, com responsável), então dá para repetir
// sem recriar o banco. O gabarito vem da API da professora — o navegador do aluno nunca o recebe.

const API_URL = (process.env.API_URL ?? "http://localhost:3333").replace(/\/$/, "");
const PROFESSOR = { email: "professor@sweetway.com", senha: "senha123" };

type Etapa = "controlada" | "semicontrolada" | "producao" | "quiz";
type ExercicioCompleto = {
  id: number;
  ordem: number;
  etapa: Etapa;
  tipo: "mcq" | "cloze" | "word_order" | "match" | "translate" | "error_correction";
  enunciado: string;
  conteudo: Record<string, unknown>;
  gabarito: Record<string, unknown>;
};

// ─── Captura de erros ───────────────────────────────────────────────────────

function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (t.includes("Download the React DevTools")) return;
    erros.push(`[console] ${t}`);
  });
  page.on("pageerror", (e) => erros.push(`[pageerror] ${e.message}`));
  page.on("requestfailed", (r) => {
    // navegação cancela fetches em andamento — não é falha da API
    if (r.failure()?.errorText.includes("ERR_ABORTED")) return;
    if (r.url().startsWith(API_URL)) erros.push(`[requestfailed] ${r.method()} ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    if (r.url().startsWith(API_URL) && r.status() >= 400) erros.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`);
  });
  return erros;
}

// ─── API (professora) ───────────────────────────────────────────────────────

async function tokenProfessor(request: APIRequestContext) {
  const r = await request.post(`${API_URL}/api/auth/login`, { data: PROFESSOR });
  expect(r.ok(), `login da professora na API (${API_URL})`).toBeTruthy();
  return (await r.json()).token as string;
}

async function licaoComGabarito(request: APIRequestContext, token: string, id: number) {
  const r = await request.get(`${API_URL}/api/conteudo/licoes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as { id: number; titulo: string; exercicios: ExercicioCompleto[] };
}

// ─── Respostas pela interface ───────────────────────────────────────────────

const normalizar = (s: string) =>
  s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().replace(/[.!?;:,\s]+$/g, "");

/** Bloco do exercício (enunciado + renderizador). */
function blocoDe(page: Page, id: number): Locator {
  return page.locator(`#enunciado-${id}`).locator("xpath=..");
}

async function responder(page: Page, e: ExercicioCompleto) {
  const bloco = blocoDe(page, e.id);
  const g = e.gabarito as { correta?: number; respostas?: string[][]; aceitas?: string[]; pares?: number[] };
  const c = e.conteudo as { opcoesPorLacuna?: (string[] | null)[] };
  switch (e.tipo) {
    case "mcq":
      await bloco.getByRole("radio").nth(g.correta!).click();
      break;
    case "cloze":
      for (const [i, aceitas] of g.respostas!.entries()) {
        const campo = bloco.getByLabel(`Lacuna ${i + 1}`, { exact: true });
        if (c.opcoesPorLacuna?.[i]) await campo.selectOption(aceitas.find((a) => c.opcoesPorLacuna![i]!.includes(a)) ?? aceitas[0]);
        else await campo.fill(aceitas[0]);
      }
      break;
    case "word_order": {
      const banco = bloco.getByRole("group", { name: "Banco de palavras" });
      const alvo = normalizar(g.aceitas![0]).split(" ");
      for (const palavra of alvo) {
        const botoes = banco.getByRole("button");
        const textos = await botoes.allTextContents();
        const n = await botoes.count();
        let clicou = false;
        for (let i = 0; i < n && !clicou; i++) {
          if (normalizar(textos[i]) === palavra && (await botoes.nth(i).isEnabled())) {
            await botoes.nth(i).click();
            clicou = true;
          }
        }
        expect(clicou, `palavra "${palavra}" no banco do exercício ${e.id}`).toBeTruthy();
      }
      break;
    }
    case "match":
      for (const [i, p] of g.pares!.entries()) await page.locator(`#match-${e.id}-${i}`).selectOption(String(p));
      break;
    case "translate":
    case "error_correction":
      await page.locator(`#texto-${e.id}`).fill(g.aceitas![0]);
      break;
  }
}

const ORDEM_ETAPAS: Etapa[] = ["controlada", "semicontrolada", "producao", "quiz"];

// ─── Testes ─────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

const sufixo = `${Date.now()}`;
const aluno = { nome: `Aluno E2E ${sufixo}`, email: `e2e-${sufixo}@teste.com`, senha: "senha123" };

test("aluno: cadastro (menor), login, trilha, lição 1 completa e trilha atualizada", async ({ page, request }) => {
  test.setTimeout(180_000);
  const erros = vigiarErros(page);

  // Cadastro de menor de idade, com responsável e consentimento (LGPD)
  await page.goto("/cadastro");
  await page.locator("#nome").fill(aluno.nome);
  await page.locator("#email").fill(aluno.email);
  await page.locator("#senha").fill(aluno.senha);
  await page.locator("#confirmacao").fill(aluno.senha);
  const ano = new Date().getFullYear() - 13;
  await page.locator("#dataNascimento").fill(`${ano}-05-10`);
  await page.locator("#responsavelNome").fill("Responsável E2E");
  await page.locator("#responsavelEmail").fill(`resp-${sufixo}@teste.com`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(/\/login\?tipo=aluno&cadastro=ok/);

  // Login pela interface
  await page.locator("#email").fill(aluno.email);
  await page.locator("#senha").fill(aluno.senha);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/aluno$/);

  // Trilha
  await page.goto("/aluno/curso");
  const comecar = page.getByRole("link", { name: /Começar|Continuar/ }).first();
  await expect(comecar).toBeVisible();
  await comecar.click();
  await page.waitForURL(/\/aluno\/curso\/licao\/\d+/);
  const licaoId = Number(page.url().match(/licao\/(\d+)/)![1]);

  const token = await tokenProfessor(request);
  const licao = await licaoComGabarito(request, token, licaoId);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(licao.titulo);

  // Apresentação
  await expect(page.getByText("Atenção, falante de português!").or(page.getByRole("heading", { name: /Exemplos/ })).first()).toBeVisible();
  await page.getByRole("button", { name: "Começar a praticar →" }).click();

  // Prática: na ordem do player (etapa, depois ordem). O primeiro item de cada tipo é respondido errado uma vez
  // ("Tentar de novo") e depois certo; os demais, certos de primeira.
  const pratica = licao.exercicios
    .filter((e) => e.etapa !== "quiz")
    .sort((a, b) => ORDEM_ETAPAS.indexOf(a.etapa) - ORDEM_ETAPAS.indexOf(b.etapa) || a.ordem - b.ordem);
  const tiposVistos = new Set<string>();
  for (const [i, e] of pratica.entries()) {
    await expect(page.locator(`#enunciado-${e.id}`)).toBeVisible();
    if (!tiposVistos.has(e.tipo) && e.tipo === "translate") {
      await page.locator(`#texto-${e.id}`).fill("zzz");
      await page.getByRole("button", { name: "Verificar" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Não foi dessa vez" })).toBeVisible();
      await page.getByRole("button", { name: "Tentar de novo" }).click();
    }
    tiposVistos.add(e.tipo);
    await responder(page, e);
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "✓ Correto!" }), `exercício ${e.id} (${e.tipo})`).toBeVisible();
    await page.getByRole("button", { name: i === pratica.length - 1 ? "Ir para o mini-quiz →" : "Continuar →" }).click();
  }

  // Mini-quiz (tudo de uma vez)
  const quiz = licao.exercicios.filter((e) => e.etapa === "quiz");
  for (const e of quiz) {
    tiposVistos.add(e.tipo);
    await responder(page, e);
  }
  await expect(page.getByText("Tudo respondido!")).toBeVisible();
  await page.getByRole("button", { name: "Enviar respostas" }).click();
  await expect(page.getByText("Lição concluída!")).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByText("+30 XP")).toBeVisible();
  console.log(`tipos respondidos na lição ${licaoId}: ${[...tiposVistos].join(", ")}`);

  // Próxima lição liberada; volta para a trilha
  await page.getByRole("link", { name: "Voltar para a trilha" }).click();
  await page.waitForURL(/\/aluno\/curso$/);
  await expect(page.getByText(/30\s*XP/).first()).toBeVisible();

  expect(erros, erros.join("\n")).toEqual([]);
});

test("aluno: revisão vazia e dashboard com o card do curso", async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto("/login?tipo=aluno");
  await page.locator("#email").fill(aluno.email);
  await page.locator("#senha").fill(aluno.senha);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/aluno$/);
  await expect(page.getByRole("link", { name: /Continuar|Começar|lição/i }).first()).toBeVisible();
  await page.goto("/aluno/curso/revisao");
  await expect(page.getByText("Nada para revisar hoje")).toBeVisible();
  expect(erros, erros.join("\n")).toEqual([]);
});

test("aluno: teste do módulo 1 pela interface (lições 2–6 concluídas pela API)", async ({ page, request }) => {
  test.setTimeout(120_000);
  const erros = vigiarErros(page);
  const prof = await tokenProfessor(request);
  const login = await request.post(`${API_URL}/api/auth/login`, { data: { email: aluno.email, senha: aluno.senha } });
  expect(login.ok()).toBeTruthy();
  const auth = { Authorization: `Bearer ${(await login.json()).token}` };

  const trilha = await (await request.get(`${API_URL}/api/curso`, { headers: auth })).json();
  const modulo = trilha.niveis[0].modulos[0];
  for (const l of modulo.licoes.filter((x: { concluida: boolean }) => !x.concluida)) {
    const k = await licaoComGabarito(request, prof, l.id);
    const respostas = Object.fromEntries(
      k.exercicios
        .filter((e) => e.etapa === "quiz")
        .map((e) => {
          const g = e.gabarito as { correta?: number; respostas?: string[][]; aceitas?: string[]; pares?: number[] };
          const r =
            e.tipo === "mcq" ? g.correta : e.tipo === "cloze" ? g.respostas!.map((a) => a[0]) : e.tipo === "match" ? g.pares
            : e.tipo === "word_order" ? g.aceitas![0].split(" ") : g.aceitas![0];
          return [e.id, r];
        })
    );
    const q = await request.post(`${API_URL}/api/curso/licoes/${l.id}/quiz`, { headers: auth, data: { respostas } });
    expect((await q.json()).aprovado, `quiz da lição ${l.id}`).toBeTruthy();
  }
  const teste = await (await request.get(`${API_URL}/api/conteudo/modulos/${modulo.id}/teste`, { headers: { Authorization: `Bearer ${prof}` } })).json();
  const chaves = new Map<number, ExercicioCompleto>(
    teste.formas.flatMap((f: { itens: ExercicioCompleto[] }) => f.itens).map((i: ExercicioCompleto) => [i.id, i])
  );

  await page.goto("/login?tipo=aluno");
  await page.locator("#email").fill(aluno.email);
  await page.locator("#senha").fill(aluno.senha);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/aluno$/);
  await page.goto("/aluno/curso");
  await page.getByRole("link", { name: /Fazer o teste/ }).first().click();
  await page.waitForURL(/\/aluno\/curso\/modulo\/\d+\/teste/);
  await page.getByRole("button", { name: "Começar o teste" }).click();

  const enunciados = page.locator('[id^="enunciado-"]');
  await expect(enunciados.first()).toBeVisible();
  const ids = (await enunciados.evaluateAll((els) => els.map((e) => e.id))).map((s) => Number(s.replace("enunciado-", "")));
  expect(ids.length).toBe(18);
  for (const id of ids) await responder(page, chaves.get(id)!);
  await page.getByRole("button", { name: "Finalizar teste" }).click();
  await expect(page.getByText("Aprovado! Módulo concluído.")).toBeVisible();
  await page.getByRole("link", { name: /próximo módulo/i }).click();
  await page.waitForURL(/\/aluno\/curso#modulo-\d+/);
  await expect(page.getByText("Hello!").first()).toBeVisible();

  expect(erros, erros.join("\n")).toEqual([]);
});

test("professora: conteúdo, editor de lição e progresso", async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto("/login?tipo=professor");
  await page.locator("#email").fill(PROFESSOR.email);
  await page.locator("#senha").fill(PROFESSOR.senha);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/professor$/);

  await page.goto("/professor/conteudo");
  await expect(page.getByText("Hello!").first()).toBeVisible();
  const editar = page.locator('a[href^="/professor/conteudo/licao/"]').first();
  await editar.click();
  await page.waitForURL(/\/professor\/conteudo\/licao\/\d+/);

  // Abre o 1º exercício e testa o gabarito no servidor (sem salvar)
  await page.locator("article button[aria-expanded]").first().click();
  await page.getByRole("button", { name: "Testar este exercício" }).first().click();
  const painel = page.getByText("Testar o gabarito (usa o que está no formulário").locator("xpath=..");
  const opcao = painel.getByRole("radio").first();
  if (await opcao.count()) await opcao.check();
  else await painel.getByRole("textbox").first().fill("test");
  await painel.getByRole("button", { name: "Testar", exact: true }).click();
  await expect(page.getByText(/(Correto|Incorreto) · pontuação/).first()).toBeVisible();

  // Edita o título, salva, recarrega e confere; depois desfaz
  const titulo = page.getByRole("textbox", { name: "Título", exact: true });
  const original = await titulo.inputValue();
  await titulo.fill(`${original} (E2E)`);
  await expect(page.getByText("Há alterações não salvas.")).toBeVisible();
  await page.getByRole("button", { name: "Salvar lição" }).click();
  await expect(page.getByText("Há alterações não salvas.")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Título", exact: true })).toHaveValue(`${original} (E2E)`);
  await page.getByRole("textbox", { name: "Título", exact: true }).fill(original);
  await page.getByRole("button", { name: "Salvar lição" }).click();
  await expect(page.getByText("Há alterações não salvas.")).toBeHidden();
  await expect(page.locator(".text-red-700").filter({ hasText: "Não foi salvo" })).toHaveCount(0);

  await page.goto("/professor/conteudo");
  await page.locator('a[href*="/teste"]').first().click();
  await page.waitForURL(/\/professor\/conteudo\/modulo\/\d+\/teste/);
  await expect(page.getByText(/Forma 1|Versão 1/).first()).toBeVisible();

  await page.goto("/professor/progresso");
  await expect(page.getByText(aluno.nome).or(page.getByText("Ana Costa")).first()).toBeVisible();

  expect(erros, erros.join("\n")).toEqual([]);
});
