// Andamento de uma lição em curso (etapa, respostas da prática e do quiz), guardado no navegador
// para que atualizar a página ou sair e voltar não zere a lição. Apagado quando o quiz é enviado.

import { getStoredUser } from "./api";
import type { ExercicioPublico, Resposta, Resultado } from "./curso";

export type FaseLicao = "apresentacao" | "pratica" | "quiz";

export type RascunhoLicao = {
  fase: FaseLicao;
  alcancada: number;
  pratica: { indice: number; respostas: Record<number, Resposta>; feedbacks: Record<number, Resultado> };
  quiz: { respostas: Record<number, Resposta> };
};

const VAZIO: RascunhoLicao = {
  fase: "apresentacao",
  alcancada: 0,
  pratica: { indice: 0, respostas: {}, feedbacks: {} },
  quiz: { respostas: {} },
};

function chave(licaoId: number) {
  const u = getStoredUser();
  return u ? `sw-licao:${u.id}:${licaoId}` : null;
}

/** Mantém só as entradas de exercícios que ainda existem (a professora pode ter editado a lição). */
function filtrar<T>(obj: unknown, ids: Set<number>): Record<number, T> {
  const saida: Record<number, T> = {};
  if (!obj || typeof obj !== "object") return saida;
  for (const [k, v] of Object.entries(obj)) if (ids.has(Number(k)) && v != null) saida[Number(k)] = v as T;
  return saida;
}

export function lerRascunho(licaoId: number, praticas: ExercicioPublico[], quiz: ExercicioPublico[]): RascunhoLicao {
  try {
    const k = chave(licaoId);
    const bruto = k ? localStorage.getItem(k) : null;
    if (!bruto) return VAZIO;
    const r = JSON.parse(bruto) as Partial<RascunhoLicao>;
    const fase: FaseLicao = r.fase === "pratica" || r.fase === "quiz" ? r.fase : "apresentacao";
    const idsPratica = new Set(praticas.map((e) => e.id));
    const idsQuiz = new Set(quiz.map((e) => e.id));
    const indice = Number(r.pratica?.indice) || 0;
    return {
      fase,
      alcancada: Math.min(2, Math.max(0, Number(r.alcancada) || 0)),
      pratica: {
        indice: Math.min(Math.max(0, indice), Math.max(0, praticas.length - 1)),
        respostas: filtrar<Resposta>(r.pratica?.respostas, idsPratica),
        feedbacks: filtrar<Resultado>(r.pratica?.feedbacks, idsPratica),
      },
      quiz: { respostas: filtrar<Resposta>(r.quiz?.respostas, idsQuiz) },
    };
  } catch {
    return VAZIO;
  }
}

export function salvarRascunho(licaoId: number, rascunho: RascunhoLicao) {
  try {
    const k = chave(licaoId);
    if (k) localStorage.setItem(k, JSON.stringify(rascunho));
  } catch {
    // sem armazenamento (modo privado/cheio): a lição segue funcionando, só não retoma
  }
}

export function apagarRascunho(licaoId: number) {
  try {
    const k = chave(licaoId);
    if (k) localStorage.removeItem(k);
  } catch {
    // idem
  }
}
