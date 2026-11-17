import { test, expect, type Page, type APIRequestContext, type Locator } from "@playwright/test";

// E2E do curso autoguiado (Fase 1). Precisa de backend com o seed e o curso PUBLICADO:
//   DATABASE_URL=postgresql://…/sweetway_e2e npx prisma migrate deploy
//   SEED_PUBLICAR_CONTEUDO=1 DATABASE_URL=postgresql://…/sweetway_e2e npx tsx prisma/seed.ts
// Roda só no projeto "curso" do playwright.config.ts (E2E_CURSO=1). Ver frontend/CLAUDE.md.
//
// Cada execução cria um aluno novo pelo /cadastro (menor de idade, com responsável), então dá para repetir
// sem recriar o banco. O gabarito vem da API da professora — o navegador do aluno nunca o recebe.

// O navegador chama `/api` na própria origem (rewrite do Next ou Caddy). As chamadas diretas do spec usam API_URL,
// que por padrão é o próprio frontend; aponte para o backend só se quiser pular o rewrite.
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API_URL = (process.env.API_URL ?? BASE_URL).replace(/\/$/, "");
const ehApi = (url: string) => url.startsWith(`${BASE_URL}/api/`) || url.startsWith(`${API_URL}/api/`);
const PROFESSOR = { email: "professor@sweetway.com", senha: "senha123" };

type Etapa = "controlada" | "semicontrolada" | "producao" | "quiz";
type ExercicioCompleto = {
  id: number;
  ordem: number;
  etapa: Etapa;
  tipo: "mcq" | "cloze" | "word_order" | "match" | "translate" | "error_correction" | "dictation";
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
    if (ehApi(r.url())) erros.push(`[requestfailed] ${r.method()} ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    if (ehApi(r.url()) && r.status() >= 400) erros.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`);
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
  const c = e.conteudo as { opcoesPorLacuna?: (string[] | null)[]; opcoes?: string[] };
  switch (e.tipo) {
    case "mcq":
      // As opções aparecem embaralhadas: clica pelo texto da certa, não pela posição
      await bloco.getByRole("radio", { name: c.opcoes![g.correta!], exact: true }).click();
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
    case "dictation": {
      // O navegador de teste pode não ter voz em inglês: espera a detecção terminar e, se aparecer o
      // aviso para pular, segue pelo "Tentar ouvir mesmo assim" (a resposta vem do gabarito, não do áudio).
      const campo = page.locator(`#texto-${e.id}`);
      await expect(bloco.locator('[data-voz="ok"], [data-voz="sem-voz"]')).toBeVisible();
      const tentar = bloco.getByRole("button", { name: "Tentar ouvir mesmo assim" });
      if (await tentar.isVisible()) await tentar.click({ timeout: 2000 }).catch(() => {});
      await expect(bloco.getByRole("button", { name: "Ouvir", exact: true })).toBeVisible();
      // A frase ditada não pode estar escrita na tela antes da resposta
      await expect(bloco).not.toContainText((e.conteudo as { frase: string }).frase);
      await campo.fill(g.aceitas![0]);
      break;
    }
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
  await expect(page.getByText("Não foi salvo:")).toHaveCount(0);

  await page.goto("/professor/conteudo");
  await page.locator('a[href*="/teste"]').first().click();
  await page.waitForURL(/\/professor\/conteudo\/modulo\/\d+\/teste/);
  await expect(page.getByText(/Forma 1|Versão 1/).first()).toBeVisible();

  await page.goto("/professor/progresso");
  await expect(page.getByText(aluno.nome).or(page.getByText("Ana Costa")).first()).toBeVisible();
  // O aluno do /cadastro não tem turma: aparece no filtro "Alunos sem turma"
  await page.locator("#filtro-turma").selectOption("sem-turma");
  await expect(page.getByRole("row").filter({ hasText: aluno.nome })).toContainText("Sem turma");

  expect(erros, erros.join("\n")).toEqual([]);
});

test("sessão: cookie httpOnly, nada de token no localStorage e sair encerra a sessão", async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto("/login?tipo=aluno");
  await page.locator("#email").fill(aluno.email);
  await page.locator("#senha").fill(aluno.senha);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/aluno$/);

  const sessao = (await page.context().cookies()).find((c) => c.name === "sw_sessao");
  expect(sessao, "cookie sw_sessao").toBeTruthy();
  expect(sessao!.httpOnly).toBe(true);
  expect(sessao!.sameSite).toBe("Lax");
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("user") ?? "{}").email)).toBe(aluno.email);

  // proxy.ts: aluno que abre a área da professora volta para a dele
  await page.goto("/professor/progresso");
  await page.waitForURL(/\/aluno$/);

  // Sair: o servidor apaga o cookie e o cache local some
  await page.getByRole("button", { name: new RegExp(aluno.nome) }).click();
  await page.getByRole("menuitem", { name: "Sair da conta" }).click();
  await page.waitForURL(/\/login\?tipo=aluno/);
  expect((await page.context().cookies()).find((c) => c.name === "sw_sessao")).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem("user"))).toBeNull();
  expect(erros, erros.join("\n")).toEqual([]);
});

test("sessão: usuário em cache com cookie vencido volta para o login", async ({ page }) => {
  // Simula um cache antigo (inclusive o `token` da versão anterior) sem cookie de sessão
  await page.goto("/login?tipo=aluno");
  await page.evaluate((u) => {
    localStorage.setItem("token", "antigo");
    localStorage.setItem("user", JSON.stringify({ id: 999999, nome: u.nome, email: u.email, role: "aluno" }));
  }, aluno);
  await page.goto("/aluno");
  await page.waitForURL(/\/login\?tipo=aluno/);
  expect(await page.evaluate(() => localStorage.getItem("user"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});

test("recuperar senha: telas enviam sem erros (o fluxo completo é testado no backend)", async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto("/login?tipo=aluno");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await page.waitForURL(/\/esqueci-senha$/);
  await page.locator("#email").fill(aluno.email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("status")).toContainText("Se houver uma conta com esse e-mail");

  // Link com token inválido: a API responde 400 e a tela explica
  await page.goto("/redefinir-senha?token=0000");
  await page.locator("#senha").fill("nova12345");
  await page.locator("#confirmacao").fill("nova12345");
  const resposta = page.waitForResponse((r) => r.url().endsWith("/api/auth/redefinir-senha"));
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  expect((await resposta).status()).toBe(400);
  await expect(page.getByRole("alert").filter({ hasText: "Link inválido ou expirado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir um novo link" })).toBeVisible();

  // Só o 400 esperado do token inválido
  expect(erros.filter((e) => !e.includes("/api/auth/redefinir-senha") && !e.includes("400 (Bad Request)")), erros.join("\n")).toEqual([]);
});
