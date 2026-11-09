// Correção determinística de exercícios. Roda só no servidor (o gabarito nunca vai ao navegador).
// Sem tolerância a "erro de digitação": em gramática, "work" × "works" é justamente o erro avaliado.
// Variações legítimas (contrações, pontuação final, maiúsculas) são normalizadas; o resto
// precisa estar listado em `aceitas`.

export type Tipo = 'mcq' | 'cloze' | 'word_order' | 'match' | 'translate' | 'error_correction';

export interface ItemCorrigivel {
  tipo: string;
  conteudo: unknown;
  gabarito: unknown;
  explicacao: string;
}

export interface Resultado {
  correto: boolean;
  pontuacao: number; // 0..1 (crédito parcial em cloze e match)
  respostaEsperada: string;
  explicacao: string;
}

// Pronomes cujo 's é verbo (is/has), e não possessivo ("Anna's")
const PRONOMES_S = ['he', 'she', 'it', 'that', 'what', 'where', 'who', 'there', 'here', 'how', 'when'];

const CONTRACOES: [RegExp, string][] = [
  [/\bcan't\b/g, 'cannot'],
  [/\bcan not\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\bi'm\b/g, 'i am'],
  [/\b(you|we|they|who|what)'re\b/g, '$1 are'],
  [/\b(i|you|we|they|he|she|it|who)'ll\b/g, '$1 will'],
  [/\b(i|you|we|they|who)'ve\b/g, '$1 have'],
  [/\blet's\b/g, 'let us'],
];

// Contrações com duas leituras: "she's" = she is | she has ("She's never been there"); "I'd" = I would | I had.
// canonicoVariantes() gera as duas para a resposta do aluno (ver iguais()).
const CONTRACAO_S = new RegExp(`\\b(${PRONOMES_S.join('|')})'s\\b`, 'g');
const CONTRACAO_D = /\b(i|you|we|they|he|she|it|who)'d\b/g;

const PONTUACAO_FINAL = new Set(['.', '!', '?', ';', ':', ',', ' ']);

/** Tira pontuação e espaços do fim sem regex ancorada em `$` (quadrática numa sequência longa). */
function semPontuacaoFinal(s: string): string {
  let fim = s.length;
  while (fim > 0 && PONTUACAO_FINAL.has(s[fim - 1])) fim--;
  return s.slice(0, fim);
}

/** Minúsculas, aspas/apóstrofos retos, espaços colapsados, sem pontuação final. */
export function normalizar(s: string): string {
  // Colapsa os espaços antes de tirar o espaço da pontuação: `\s+([,.!?;:])` direto é quadrático (ReDoS)
  const r = s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/ ([,.!?;:])/g, '$1')
    .trim();
  return semPontuacaoFinal(r).trim();
}

/**
 * Normaliza e expande contrações: "She isn't here." ≡ "she is not here".
 * 's e 'd viram a leitura mais comum (is, would); canonicoVariantes() dá também a outra.
 */
export function canonico(s: string): string {
  return canonicoVariantes(s)[0];
}

/** Formas canônicas de uma frase: a principal e, se houver 's ou 'd de pronome, a leitura com has/had. */
export function canonicoVariantes(s: string): string[] {
  let r = normalizar(s);
  for (const [re, sub] of CONTRACOES) r = r.replace(re, sub);
  r = r.replace(/\s*,\s*/g, ', ');
  const principal = r.replace(CONTRACAO_S, '$1 is').replace(CONTRACAO_D, '$1 would');
  const alternativa = r.replace(CONTRACAO_S, '$1 has').replace(CONTRACAO_D, '$1 had');
  return principal === alternativa ? [principal] : [principal, alternativa];
}

/** Palavras de uma frase (sem pontuação final), normalizadas — para comparar com o banco de palavras. */
export function tokensFrase(frase: string): string[] {
  return normalizar(frase).split(' ').filter(Boolean);
}

/**
 * Só a resposta do aluno ganha as duas leituras de 's/'d: "She's never been" bate com "She has never been".
 * O gabarito fica na leitura comum (is, would), senão "She has a teacher" passaria por "She's a teacher".
 * Por isso, no gabarito, has/had vão por extenso (a forma contraída do aluno é aceita do mesmo jeito).
 */
function iguais(resposta: string, aceitas: string[]) {
  const r = canonicoVariantes(resposta);
  if (!r[0]) return false;
  return aceitas.some((a) => r.includes(canonico(a)));
}

const resultado = (correto: boolean, pontuacao: number, respostaEsperada: string, explicacao: string): Resultado => ({
  correto,
  pontuacao: Math.round(pontuacao * 100) / 100,
  respostaEsperada,
  explicacao,
});

export class RespostaInvalida extends Error {}

/**
 * Corrige uma resposta. Formato esperado de `resposta` por tipo:
 * mcq: number · cloze: string[] · word_order: string[] · match: number[] · translate/error_correction: string
 */
export function corrigir(item: ItemCorrigivel, resposta: unknown): Resultado {
  const c = item.conteudo as any;
  const g = item.gabarito as any;
  const exp = item.explicacao;

  switch (item.tipo as Tipo) {
    case 'mcq': {
      if (typeof resposta !== 'number') throw new RespostaInvalida('mcq espera o índice da opção');
      return resultado(resposta === g.correta, resposta === g.correta ? 1 : 0, c.opcoes[g.correta], exp);
    }
    case 'cloze': {
      const respostas: string[][] = g.respostas;
      if (!Array.isArray(resposta) || resposta.some((r) => typeof r !== 'string'))
        throw new RespostaInvalida('cloze espera uma lista de textos');
      const certas = respostas.filter((aceitas, i) => iguais(String(resposta[i] ?? ''), aceitas)).length;
      const partes = String(c.texto).split('___');
      const esperada = partes.reduce((acc, parte, i) => acc + parte + (i < respostas.length ? respostas[i][0] : ''), '');
      return resultado(certas === respostas.length, certas / respostas.length, esperada, exp);
    }
    case 'word_order': {
      if (!Array.isArray(resposta) || resposta.some((r) => typeof r !== 'string'))
        throw new RespostaInvalida('word_order espera a lista de palavras na ordem');
      const ok = iguais(resposta.join(' '), g.aceitas);
      return resultado(ok, ok ? 1 : 0, g.aceitas[0], exp);
    }
    case 'match': {
      const pares: number[] = g.pares;
      if (!Array.isArray(resposta) || resposta.some((r) => typeof r !== 'number'))
        throw new RespostaInvalida('match espera a lista de índices');
      const certas = pares.filter((p, i) => resposta[i] === p).length;
      const esperada = (c.esquerda as string[]).map((e, i) => `${e} → ${c.direita[pares[i]]}`).join('; ');
      return resultado(certas === pares.length, certas / pares.length, esperada, exp);
    }
    case 'translate':
    case 'error_correction': {
      if (typeof resposta !== 'string') throw new RespostaInvalida('esperado um texto');
      const ok = iguais(resposta, g.aceitas);
      return resultado(ok, ok ? 1 : 0, g.aceitas[0], exp);
    }
    default:
      throw new RespostaInvalida(`tipo de exercício desconhecido: ${item.tipo}`);
  }
}

/** Remove o que não pode ir ao navegador. */
export function versaoPublica<T extends { gabarito: unknown; explicacao: string; tagsErro?: unknown }>(item: T) {
  const { gabarito: _g, explicacao: _e, tagsErro: _t, ...publico } = item;
  return publico;
}
