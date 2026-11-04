"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Play, Repeat2, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatarDataHora, proximoPasso, type Trilha } from "@/lib/curso";

/** Cartão "Continue seu curso" do painel do aluno: leva à próxima lição liberada (GET /curso). */
export function ContinuarCursoCard() {
  const [trilha, setTrilha] = useState<Trilha | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/curso");
        if (cancelled) return;
        if (!res.ok) {
          setFalhou(true);
          return;
        }
        const data: Trilha = await res.json();
        if (!cancelled) setTrilha(data);
      } catch {
        if (!cancelled) setFalhou(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Se o curso não carregar, o painel segue funcionando sem o cartão
  if (falhou) return null;

  const base =
    "relative overflow-hidden p-5 sm:p-6 rounded-[1.75rem] bg-gradient-to-br from-grape via-grape to-grape-bright text-white shadow-lg flex flex-col sm:flex-row sm:items-center gap-4";
  const botao =
    "relative inline-flex min-h-[48px] justify-center items-center gap-2 px-6 py-3 rounded-2xl bg-white font-display text-[1.05rem] font-semibold text-grape shadow-[0_4px_0_0_rgb(0_0_0/0.18)] hover:bg-grape-mist active:translate-y-[3px] active:shadow-none transition-all shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60";

  if (!trilha) {
    return (
      <div className={base} aria-busy="true">
        <p className="text-sm opacity-90">Carregando seu curso…</p>
      </div>
    );
  }

  const passo = proximoPasso(trilha);
  const { perfil } = trilha;

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

  return (
    <div className={base}>
      <span className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-candy-bright/40 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-sky-bright/30 blur-2xl" aria-hidden />
      <div className="relative flex-1 min-w-0">
        <p className="eyebrow text-white/85">Continue seu curso</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-tight break-words">{titulo}</p>
        <p className="mt-0.5 text-sm text-white/85 break-words">{subtitulo}</p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
            <Zap className="h-4 w-4 fill-sun text-sun" aria-hidden />
            {perfil.xp} XP
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
            <Flame className="h-4 w-4 fill-flame text-flame" aria-hidden />
            {perfil.ofensivaAtual} {perfil.ofensivaAtual === 1 ? "dia" : "dias"}
          </li>
          {perfil.revisoesPendentes > 0 && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
              <Repeat2 className="h-4 w-4" aria-hidden />
              {perfil.revisoesPendentes} para revisar
            </li>
          )}
        </ul>
      </div>
      <Link href={href} className={botao}>
        <Play className="h-4 w-4 fill-current" aria-hidden />
        {acao} →
      </Link>
    </div>
  );
}
