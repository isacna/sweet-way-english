import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Exercita o player real com API simulada; não usa conta nem modifica o banco.
const modulo = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../backend/prisma/conteudo/a1/m04.json'), 'utf8'));
const fonte = modulo.licoes[0];
const exercicios = fonte.exercicios.filter((e: { tagsErro?: string[] }) => e.tagsErro?.includes('piloto_multimidia_v1'));

for (const largura of [1280, 390]) {
  test(`mídia, sequência e missão em ${largura}px`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: largura, height: 900 });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    const payload = Buffer.from(JSON.stringify({ role: 'aluno', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    await context.addCookies([{ name: 'sw_sessao', value: `teste.${payload}.teste`, url: testInfo.project.use.baseURL as string }]);
    const user = { id: 999, nome: 'Aluno de teste', email: 'teste@example.com', role: 'aluno' };
    await page.addInitScript((u) => localStorage.setItem('user', JSON.stringify(u)), user);
    let nota = '';
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: { user } });
      if (url.pathname.endsWith('/nota')) {
        if (route.request().method() === 'PUT') nota = route.request().postDataJSON().texto;
        return route.fulfill({ json: { texto: nota, atualizadoEm: new Date().toISOString() } });
      }
      if (url.pathname === '/api/curso/licoes/999') return route.fulfill({ json: {
        ...fonte, id: 999, modulo: { id: 1, slug: modulo.slug, titulo: modulo.titulo, ordem: 4 },
        exercicios: exercicios.map((e: Record<string, unknown>, i: number) => ({ id: 100 + i, ordem: i + 1, tipo: e.tipo, etapa: e.etapa, enunciado: e.enunciado, conteudo: e.conteudo })),
        progresso: { concluida: false, melhorPercentual: 0, tentativas: 0 }, proximaLicaoId: null, nota: null,
      } });
      if (url.pathname.endsWith('/verificar')) return route.fulfill({ json: { correto: true, pontuacao: 1, respostaEsperada: 'Sequência correta.', explicacao: 'As ações seguem os horários informados.' } });
      return route.fulfill({ json: [] });
    });
    await page.goto('/aluno/curso/licao/999');
    await expect(page.getByRole('button', { name: 'Carregar vídeo do YouTube' })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`apresentacao-${largura}.png`), fullPage: true });
    await page.getByRole('button', { name: /Começar a praticar/ }).click();
    await expect(page.getByText('Rotinas em contexto — 1')).toBeVisible();
    await page.getByText('Ler transcrição / apoio à escuta').click();
    await expect(page.getByText('I work at a bakery.', { exact: false }).first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Sua resposta em inglês' }).fill('I work in a shop. I study at night.');
    await page.getByRole('button', { name: 'Guardar nas minhas notas' }).click();
    await expect.poll(() => nota).toContain('I study at night.');
    await page.getByRole('button', { name: 'Pular', exact: true }).click();
    const banco = page.getByRole('group', { name: 'Trechos disponíveis' });
    for (const texto of ['I get up at six.', 'I have breakfast at six thirty.', 'I go to work at seven.']) await banco.getByRole('button', { name: texto, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Verificar', exact: true })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`pratica-${largura}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Verificar', exact: true }).click();
    await expect(page.getByText('As ações seguem os horários informados.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(erros).toEqual([]);
  });
}
