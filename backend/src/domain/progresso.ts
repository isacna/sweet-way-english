// Regras de progresso do aprendiz: domínio de lição, teste de módulo, revisão espaçada, XP e ofensiva.

export const PERCENTUAL_DOMINIO_LICAO = 80; // mastery learning (Bloom/Guskey: 80–90%)
export const PERCENTUAL_APROVACAO_TESTE = 75; // no geral…
export const PERCENTUAL_MINIMO_HABILIDADE = 60; // …e em cada habilidade
export const ESPERA_REPROVACAO_HORAS = 24;

export const XP = {
  licaoConcluida: 30, // primeira vez que atinge o domínio
  licaoMelhorada: 5, // refez e superou a melhor nota
  revisaoCorreta: 2,
  testeAprovado: 100,
} as const;

// ─── Revisão espaçada (Leitner, caixas 1–5) ─────────────────────────────────

const INTERVALO_DIAS_POR_CAIXA = [1, 2, 4, 7, 15];
export const CAIXA_MAXIMA = INTERVALO_DIAS_POR_CAIXA.length;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Acerto sobe uma caixa; erro volta para a caixa 1 e o item fica disponível de novo já. */
export function proximaRevisao(caixaAtual: number, acertou: boolean, agora = new Date()) {
  if (!acertou) return { caixa: 1, proximaEm: agora };
  const caixa = Math.min(caixaAtual + 1, CAIXA_MAXIMA);
  return { caixa, proximaEm: new Date(agora.getTime() + INTERVALO_DIAS_POR_CAIXA[caixa - 1] * DIA_MS) };
}

/** Item recém-errado na prática: entra na caixa 1, para revisar a partir de amanhã. */
export function novaRevisao(agora = new Date()) {
  return { caixa: 1, proximaEm: new Date(agora.getTime() + DIA_MS) };
}

// ─── Ofensiva (dias seguidos de estudo, no fuso de Brasília) ────────────────

const FUSO = 'America/Sao_Paulo';

export function diaLocal(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(d); // AAAA-MM-DD
}

function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / DIA_MS);
}

export function atualizarOfensiva(
  perfil: { ofensivaAtual: number; ofensivaMaxima: number; ultimoEstudoEm: Date | null },
  agora = new Date(),
) {
  let ofensivaAtual = 1;
  if (perfil.ultimoEstudoEm) {
    const diff = diasEntre(diaLocal(perfil.ultimoEstudoEm), diaLocal(agora));
    if (diff === 0) ofensivaAtual = Math.max(perfil.ofensivaAtual, 1);
    else if (diff === 1) ofensivaAtual = perfil.ofensivaAtual + 1;
  }
  return {
    ofensivaAtual,
    ofensivaMaxima: Math.max(perfil.ofensivaMaxima, ofensivaAtual),
    ultimoEstudoEm: agora,
  };
}

/** Ofensiva exibida: zera se o último estudo foi antes de ontem. */
export function ofensivaVigente(perfil: { ofensivaAtual: number; ultimoEstudoEm: Date | null }, agora = new Date()) {
  if (!perfil.ultimoEstudoEm) return 0;
  return diasEntre(diaLocal(perfil.ultimoEstudoEm), diaLocal(agora)) <= 1 ? perfil.ofensivaAtual : 0;
}

// ─── Meta diária (XP por dia, no fuso de Brasília) ──────────────────────────

/** Opções de meta: leve (uma revisão curta), regular (uma lição) e intensa (duas lições). */
export const METAS_DIARIAS = [10, 30, 60] as const;
export const META_DIARIA_PADRAO = 30;

/** XP já ganho hoje: o contador só vale se o último estudo foi hoje. */
export function xpDoDiaVigente(perfil: { xpDoDia: number; ultimoEstudoEm: Date | null }, agora = new Date()) {
  if (!perfil.ultimoEstudoEm) return 0;
  return diaLocal(perfil.ultimoEstudoEm) === diaLocal(agora) ? perfil.xpDoDia : 0;
}

// ─── Teste de módulo ────────────────────────────────────────────────────────

export function avaliarTeste(resultados: { habilidade: string; pontuacao: number }[]) {
  const total = resultados.reduce((s, r) => s + r.pontuacao, 0);
  const percentual = resultados.length ? Math.round((total / resultados.length) * 100) : 0;
  const grupos = new Map<string, number[]>();
  for (const r of resultados) grupos.set(r.habilidade, [...(grupos.get(r.habilidade) ?? []), r.pontuacao]);
  const porHabilidade: Record<string, number> = {};
  for (const [h, ps] of grupos) porHabilidade[h] = Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100);
  const aprovado =
    percentual >= PERCENTUAL_APROVACAO_TESTE &&
    Object.values(porHabilidade).every((p) => p >= PERCENTUAL_MINIMO_HABILIDADE);
  return { percentual, porHabilidade, aprovado };
}
