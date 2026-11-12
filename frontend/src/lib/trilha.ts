// Trilha do curso (GET /curso) para as peças do painel: a barra lateral e o painel do aluno
// pedem a mesma coisa ao mesmo tempo, então as chamadas simultâneas dividem uma só requisição.

import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { PerfilAprendiz, Trilha } from "./curso";

let emVoo: Promise<Trilha | null> | null = null;
const EVENTO = "sw-trilha-mudou";

/** `null` quando o curso não pôde ser carregado. */
export function buscarTrilha(): Promise<Trilha | null> {
  if (!emVoo) {
    emVoo = apiFetch("/curso")
      .then((res) => (res.ok ? (res.json() as Promise<Trilha>) : null))
      .catch(() => null)
      .finally(() => {
        // Só junta chamadas quase simultâneas; depois disso busca de novo (o progresso muda)
        setTimeout(() => {
          emVoo = null;
        }, 1500);
      });
  }
  return emVoo;
}

/**
 * Recarrega quando `chave` muda (ex.: o caminho da página, para refletir uma lição recém-concluída)
 * e quando o perfil é alterado por `salvarPerfil` em qualquer lugar da tela.
 */
export function useTrilha(chave = "") {
  const [estado, setEstado] = useState<{ trilha: Trilha | null; falhou: boolean }>({ trilha: null, falhou: false });

  useEffect(() => {
    let cancelado = false;
    const carregar = () =>
      void buscarTrilha().then((t) => {
        if (cancelado) return;
        // Se uma atualização falhar, mantém o que já estava na tela
        setEstado((antes) => (t ? { trilha: t, falhou: false } : antes.trilha ? antes : { trilha: null, falhou: true }));
      });
    carregar();
    window.addEventListener(EVENTO, carregar);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO, carregar);
    };
  }, [chave]);

  return estado;
}

/** Opções de meta diária (as mesmas de METAS_DIARIAS no backend). */
export const METAS_DIARIAS = [
  { xp: 10, nome: "Leve", detalhe: "Cerca de 5 min: uma revisão rápida" },
  { xp: 30, nome: "Regular", detalhe: "Cerca de 15 min: uma lição" },
  { xp: 60, nome: "Intensa", detalhe: "Cerca de 30 min: duas lições" },
] as const;

/** PATCH /curso/perfil. Devolve o perfil novo e avisa as peças que mostram a trilha; `null` se falhar. */
export async function salvarPerfil(dados: {
  metaDiariaXp?: number;
  onboardingConcluido?: true;
  /** Lembretes de estudo por e-mail: true liga, false desliga. */
  lembretesEmail?: boolean;
}): Promise<PerfilAprendiz | null> {
  const res = await apiFetch("/curso/perfil", { method: "PATCH", body: JSON.stringify(dados) }).catch(() => null);
  if (!res?.ok) return null;
  const perfil = (await res.json()) as PerfilAprendiz;
  emVoo = null; // a próxima leitura não pode reaproveitar a resposta de antes da mudança
  window.dispatchEvent(new Event(EVENTO));
  return perfil;
}

/** Lições concluídas e total do curso inteiro. */
export function totaisDaTrilha(trilha: Trilha) {
  const modulos = trilha.niveis.flatMap((n) => n.modulos);
  const concluidas = modulos.reduce((s, m) => s + m.licoesConcluidas, 0);
  const total = modulos.reduce((s, m) => s + m.totalLicoes, 0);
  // Para o percentual, um módulo aprovado no teste conta inteiro (quem adiantou o teste não fez as lições)
  const vencidas = modulos.reduce((s, m) => s + (m.teste.aprovado ? m.totalLicoes : m.licoesConcluidas), 0);
  return { concluidas, total, percentual: total ? Math.round((vencidas / total) * 100) : 0 };
}
