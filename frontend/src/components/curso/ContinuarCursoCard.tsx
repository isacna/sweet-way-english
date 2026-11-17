"use client";

import Link from "next/link";
import { Play, Repeat2 } from "lucide-react";
import { formatarDataHora, proximoPasso, type Trilha } from "@/lib/curso";

/** A partir de quantas revisões pendentes o cartão passa a pedir a revisão antes da lição nova. */
const REVISOES_PARA_PRIORIZAR = 10;

/** Cartão "Continue seu curso" do painel do aluno: leva à próxima lição liberada. A trilha vem de `useTrilha()`. */
export function ContinuarCursoCard({ trilha, falhou }: { trilha: Trilha | null; falhou: boolean }) {
  // Se o curso não carregar, o painel segue funcionando sem o cartão
  if (falhou) return null;

  const base =
    "relative overflow-hidden p-5 sm:p-7 rounded-[1.75rem] border border-grape/30 bg-card text-ink flex flex-col sm:flex-row sm:items-center gap-5";
  const botao =
    "relative inline-flex min-h-[48px] justify-center items-center gap-2 px-6 py-3 rounded-2xl bg-grape font-display text-[1.05rem] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_4px_0_0_var(--color-grape-strong)] hover:bg-grape-strong active:translate-y-[3px] active:shadow-none transition-all shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40";

  if (!trilha) {
    return (
      <div className={base} aria-busy="true">
        <p className="text-sm text-ink-soft">Carregando seu curso…</p>
      </div>
    );
  }

  const passo = proximoPasso(trilha);
  const { perfil } = trilha;
  const modulo = "modulo" in passo ? passo.modulo : null;

  let titulo: string;
  let subtitulo: string;
  let href = "/aluno/curso";
  let acao = "Abrir o curso";
  switch (passo.tipo) {
    case "licao":
      subtitulo = `Módulo ${passo.modulo.ordem} · Lição ${passo.licao.ordem} · ${passo.licao.minutosEstimados} min`;
      titulo = passo.licao.titulo;
      href = `/aluno/curso/licao/${passo.licao.id}`;
      acao = passo.modulo.licoesConcluidas === 0 && passo.modulo.ordem === 1 ? "Começar" : "Continuar";
      break;
    case "teste":
      subtitulo = `Módulo ${passo.modulo.ordem} · todas as lições concluídas`;
      titulo = `Teste: ${passo.modulo.titulo}`;
      href = `/aluno/curso/modulo/${passo.modulo.id}/teste`;
      acao = "Fazer o teste";
      break;
    case "espera":
      subtitulo = `Módulo ${passo.modulo.ordem} · nova tentativa a partir de ${formatarDataHora(passo.bloqueadoAte)}`;
      titulo = "Revise enquanto espera o próximo teste";
      href = perfil.revisoesPendentes > 0 ? "/aluno/curso/revisao" : "/aluno/curso";
      acao = perfil.revisoesPendentes > 0 ? "Revisar" : "Ver a trilha";
      break;
    case "fim":
      subtitulo = "Você está em dia";
      titulo = "Novas lições chegam em breve";
      break;
    default:
      subtitulo = "Curso de inglês";
      titulo = "O curso está sendo preparado pela professora";
      acao = "Ver o curso";
  }

  // Revisão acumulada: revisar vem antes de avançar (a lição seguinte fica como ação secundária)
  const revisarPrimeiro =
    perfil.revisoesPendentes >= REVISOES_PARA_PRIORIZAR && (passo.tipo === "licao" || passo.tipo === "teste");
  if (revisarPrimeiro) {
    return (
      <div className={base}>
        <span className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-candy-bright/20 blur-3xl" aria-hidden />
        <div className="relative flex-1 min-w-0">
          <p className="eyebrow text-candy">Revisão acumulada</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-[1.7rem]">
            {perfil.revisoesPendentes} itens esperando revisão
          </p>
          <p className="mt-1 text-sm text-ink-soft break-words">
            Revisar primeiro firma o que você já viu. Cada acerto vale XP para a meta de hoje.
          </p>
          <p className="mt-3 text-sm text-ink-soft break-words">
            Depois: <span className="font-medium text-ink">{titulo}</span>
          </p>
        </div>
        <div className="relative flex shrink-0 flex-col gap-2 sm:items-stretch">
          <Link href="/aluno/curso/revisao" className={botao}>
            <Repeat2 className="h-4 w-4" aria-hidden />
            Revisar agora
          </Link>
          <Link
            href={href}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-grape hover:bg-grape-soft"
          >
            {acao}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      <span className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-grape/30 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-candy-bright/10 blur-3xl" aria-hidden />
      <div className="relative flex-1 min-w-0">
        <p className="eyebrow text-grape">Continue seu curso</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-tight tracking-[-0.02em] break-words sm:text-[1.7rem]">{titulo}</p>
        <p className="mt-1 text-sm text-ink-soft break-words">{subtitulo}</p>
        {modulo && modulo.totalLicoes > 0 && (
          <div className="mt-4 max-w-sm">
            <div
              className="h-2 overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label={`Lições concluídas no módulo ${modulo.ordem}`}
              aria-valuemin={0}
              aria-valuemax={modulo.totalLicoes}
              aria-valuenow={modulo.licoesConcluidas}
            >
              <div
                className="h-full rounded-full bg-grape-bright"
                style={{ width: `${(modulo.licoesConcluidas / modulo.totalLicoes) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-ink-soft">
              {modulo.licoesConcluidas} de {modulo.totalLicoes} lições do módulo
            </p>
          </div>
        )}
      </div>
      <Link href={href} className={botao}>
        <Play className="h-4 w-4 fill-current" aria-hidden />
        {acao} →
      </Link>
    </div>
  );
}
