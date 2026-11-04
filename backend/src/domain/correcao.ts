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
  [/\b(i|you|we|they|he|she|it|who)'d\b/g, '$1 would'],
  [new RegExp(`\\b(${PRONOMES_S.join('|')})'s\\b`, 'g'), '$1 is'],
  [/\blet's\b/g, 'let us'],
];

/** Minúsculas, aspas/apóstrofos retos, espaços colapsados, sem pontuação final. */
export function normalizar(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?;:,\s]+$/g, '')
    .trim();
}

/** Normaliza e expande contrações: "She isn't here." ≡ "she is not here". */
export function canonico(s: string): string {
  let r = normalizar(s);
  for (const [re, sub] of CONTRACOES) r = r.replace(re, sub);
  return r.replace(/\s*,\s*/g, ', ');
}

/** Palavras de uma frase (sem pontuação final), normalizadas — para comparar com o banco de palavras. */
export function tokensFrase(frase: string): string[] {
  return normalizar(frase).split(' ').filter(Boolean);
}

function iguais(resposta: string, aceitas: string[]) {
  const r = canonico(resposta);
  return r.length > 0 && aceitas.some((a) => canonico(a) === r);
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
