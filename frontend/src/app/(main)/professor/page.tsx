"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";
import { CalendarDays, Play, SquareCheckBig, UsersRound } from "lucide-react";

type TurmaResumo = {
  id: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  _count?: { matriculas: number };
};

type SubmissaoItem = {
  id: number;
  status: string;
  dataEnvio: string;
  aluno?: { nome: string };
  atividadeTitulo: string;
  turmaNome: string;
  turmaId: number;
  atividadeId: number;
};

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [turmas, setTurmas] = useState<TurmaResumo[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [pendentes, setPendentes] = useState(0);
  const [submissoesRecentes, setSubmissoesRecentes] = useState<SubmissaoItem[]>(
    []
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resTurmas = await apiFetch("/turmas");
    if (resTurmas.status === 401 || resTurmas.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!resTurmas.ok) {
      setCarregando(false);
      return;
    }
    const lista: TurmaResumo[] = await resTurmas.json();
    setTurmas(lista);

    const alunos = lista.reduce(
      (acc, t) => acc + (t._count?.matriculas ?? 0),
      0
    );
    setTotalAlunos(alunos);

    const todasPendentes: SubmissaoItem[] = [];
    await Promise.all(
      lista.map(async (t) => {
        const r = await apiFetch(`/turmas/${t.id}/atividades`);
        if (!r.ok) return;
        const atividades: {
          id: number;
          titulo: string;
          submissoes: {
            id: number;
            status: string;
            dataEnvio: string;
            aluno?: { nome: string };
          }[];
        }[] = await r.json();
        for (const a of atividades) {
          for (const s of a.submissoes) {
            if (s.status === "pendente") {
              todasPendentes.push({
                id: s.id,
                status: s.status,
                dataEnvio: s.dataEnvio,
                aluno: s.aluno,
                atividadeTitulo: a.titulo,
                turmaNome: t.nome,
                turmaId: t.id,
                atividadeId: a.id,
              });
            }
          }
        }
      })
    );

    todasPendentes.sort(
      (x, y) =>
        new Date(y.dataEnvio).getTime() - new Date(x.dataEnvio).getTime()
    );
    setPendentes(todasPendentes.length);
    setSubmissoesRecentes(todasPendentes.slice(0, 5));
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregar();
    });
  }, [carregar]);

  const stats = [
    {
      label: "Total de Alunos",
      value: carregando ? "…" : String(totalAlunos),
      icon: "users" as const,
      color: "bg-accent/10 text-accent",
    },
    {
      label: "Para Corrigir",
      value: carregando ? "…" : String(pendentes),
      icon: "check" as const,
      color: "bg-orange-100 text-orange-600",
    },
    {
      label: "Turmas ativas",
      value: carregando ? "…" : String(turmas.length),
      icon: "calendar" as const,
      color: "bg-green-100 text-green-600",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Painel do Professor
          </h1>
          <p className="text-ink-soft mt-1">
            Visão geral das suas turmas e atividades.
          </p>
        </div>
        <Button href="/professor/atividade/nova" variant="primary" size="md">
          <Play aria-hidden className="h-[18px] w-[18px] shrink-0 fill-current" />
          Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card p-3.5 sm:p-6"
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl sm:mb-4 sm:h-12 sm:w-12 ${stat.color}`}
            >
              {stat.icon === "users" && (
                <UsersRound aria-hidden className="h-[24px] w-[24px] shrink-0" />
              )}
              {stat.icon === "check" && (
                <SquareCheckBig aria-hidden className="h-[24px] w-[24px] shrink-0" />
              )}
              {stat.icon === "calendar" && (
                <CalendarDays aria-hidden className="h-[24px] w-[24px] shrink-0" />
              )}
            </div>
            <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">{stat.value}</p>
            <p className="text-xs leading-snug text-ink-soft sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-ink mb-1">
            Submissões Recentes
          </h2>
          <p className="text-sm text-ink-soft mb-6">
            Atividades aguardando o seu feedback
          </p>
          <div className="divide-y divide-gray-100">
            {carregando ? (
              <p className="text-sm text-ink-soft py-4">Carregando…</p>
            ) : submissoesRecentes.length === 0 ? (
              <p className="text-sm text-ink-soft py-4">
                Nenhuma submissão pendente.
              </p>
            ) : (
              submissoesRecentes.map((sub) => {
                const inicial = (sub.aluno?.nome ?? "?").slice(0, 2);
                return (
                  <div
                    key={sub.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-ink-soft">
                          {inicial}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">
                          {sub.aluno?.nome ?? "Aluno"}
                        </p>
                        <p className="text-sm text-ink-soft truncate">
                          {sub.atividadeTitulo} • {sub.turmaNome}
                        </p>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {tempoRelativoPt(sub.dataEnvio)}
                        </p>
                      </div>
                    </div>
                    <Button
                      href={`/professor/turmas/${sub.turmaId}?atividade=${sub.atividadeId}`}
                      variant="secondary"
                      size="sm"
                    >
                      Avaliar
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-ink mb-6">
            Minhas Turmas
          </h2>
          <div className="space-y-4">
            {carregando ? (
              <p className="text-sm text-ink-soft">Carregando…</p>
            ) : turmas.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Você ainda não criou turmas.{" "}
                <Link
                  href="/professor/turmas/nova"
                  className="text-accent font-medium hover:text-accent-strong"
                >
                  Criar turma
                </Link>
              </p>
            ) : (
              turmas.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-ink">{cls.nome}</p>
                    <p className="text-sm text-ink-soft">
                      Código: {cls.codigoConvite}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-sm text-ink-soft">
                    {cls._count?.matriculas ?? 0} alunos
                  </span>
                </div>
              ))
            )}
          </div>
          <Link
            href="/professor/turmas"
            className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-strong"
          >
            Ver todas as turmas
          </Link>
        </div>
      </div>
    </div>
  );
}
