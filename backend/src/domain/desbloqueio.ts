// Regras de desbloqueio da trilha (funções puras, sem banco).
//  - Primeiro módulo publicado: liberado. Módulo N: liberado quando o teste do módulo N−1 foi aprovado.
//  - Lição 1 de um módulo liberado: liberada. Lição N: liberada quando a N−1 está concluída.
//  - Teste: disponível quando todas as lições publicadas do módulo estão concluídas e não está em espera
//    (ESPERA_REPROVACAO_HORAS após uma reprovação).
import { ESPERA_REPROVACAO_HORAS } from './progresso.js';

const HORA_MS = 60 * 60 * 1000;

/** Módulo publicado, com as lições publicadas — ambos já na ordem da trilha. */
export interface ModuloDaTrilha {
  id: number;
  licoes: { id: number }[];
}

/** Tentativa de teste finalizada. */
export interface TentativaFinalizada {
  moduloId: number;
  aprovado: boolean | null;
  percentual: number | null;
  finalizadaEm: Date | null;
}

export interface EstadoLicao {
  desbloqueada: boolean;
  concluida: boolean;
}

export interface EstadoModulo {
  desbloqueado: boolean;
  licoes: Map<number, EstadoLicao>;
  licoesConcluidas: number;
  totalLicoes: number;
  todasConcluidas: boolean;
  aprovado: boolean;
  melhorPercentual: number | null;
  tentativas: number;
  bloqueadoAte: Date | null;
  testeDisponivel: boolean;
  proximoModuloId: number | null;
}

/** Fim da espera após a última tentativa, se ela foi reprovada e a espera ainda não acabou. */
export function bloqueadoAte(tentativas: TentativaFinalizada[], agora = new Date()): Date | null {
  const finalizadas = tentativas.filter((t) => t.finalizadaEm);
  if (!finalizadas.length) return null;
  const ultima = finalizadas.reduce((a, b) => (b.finalizadaEm!.getTime() > a.finalizadaEm!.getTime() ? b : a));
  if (ultima.aprovado) return null;
  const fim = new Date(ultima.finalizadaEm!.getTime() + ESPERA_REPROVACAO_HORAS * HORA_MS);
  return fim.getTime() > agora.getTime() ? fim : null;
}

export function calcularTrilha(
  modulos: ModuloDaTrilha[],
  licoesConcluidas: Set<number>,
  tentativas: TentativaFinalizada[],
  agora = new Date(),
): Map<number, EstadoModulo> {
  const estados = new Map<number, EstadoModulo>();
  let anteriorAprovado = true; // o primeiro módulo da trilha está sempre liberado

  modulos.forEach((m, idx) => {
    const desbloqueado = anteriorAprovado;
    const doModulo = tentativas.filter((t) => t.moduloId === m.id && t.finalizadaEm);
    const aprovado = doModulo.some((t) => t.aprovado === true);
    const percentuais = doModulo.map((t) => t.percentual).filter((p): p is number => typeof p === 'number');

    const licoes = new Map<number, EstadoLicao>();
    let anteriorConcluida = true;
    for (const l of m.licoes) {
      const concluida = licoesConcluidas.has(l.id);
      licoes.set(l.id, { desbloqueada: desbloqueado && anteriorConcluida, concluida });
      anteriorConcluida = concluida;
    }
    const concluidas = m.licoes.filter((l) => licoesConcluidas.has(l.id)).length;
    const todasConcluidas = concluidas === m.licoes.length;
    const espera = bloqueadoAte(doModulo, agora);

    estados.set(m.id, {
      desbloqueado,
      licoes,
      licoesConcluidas: concluidas,
      totalLicoes: m.licoes.length,
      todasConcluidas,
      aprovado,
      melhorPercentual: percentuais.length ? Math.max(...percentuais) : null,
      tentativas: doModulo.length,
      bloqueadoAte: espera,
      testeDisponivel: desbloqueado && todasConcluidas && !espera,
      proximoModuloId: modulos[idx + 1]?.id ?? null,
    });
    anteriorAprovado = desbloqueado && aprovado;
  });

  return estados;
}

/** Próxima forma em rodízio, diferente da última quando houver mais de uma. */
export function escolherForma(formas: number[], ultima: number | null): number | null {
  const ordenadas = [...new Set(formas)].sort((a, b) => a - b);
  if (!ordenadas.length) return null;
  if (ultima === null) return ordenadas[0];
  return ordenadas.find((f) => f > ultima) ?? ordenadas[0];
}

/** Resposta "vazia" por tipo: corrigir() a trata como errada e ainda devolve a resposta esperada. */
export function respostaVazia(tipo: string): unknown {
  switch (tipo) {
    case 'mcq':
      return -1;
    case 'sequence':
    case 'cloze':
    case 'word_order':
    case 'match':
      return [];
    default:
      return '';
  }
}

/** Percentual (0–100) a partir das pontuações (0–1), com crédito parcial. */
export function percentualDe(pontuacoes: number[]): number {
  if (!pontuacoes.length) return 0;
  return Math.round((pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length) * 100);
}
