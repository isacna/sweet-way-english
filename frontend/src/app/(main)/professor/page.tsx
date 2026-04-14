"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";

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
      color: "bg-[#1898DC]/10 text-[#1898DC]",
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
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Painel do Professor
          </h1>
          <p className="text-[#4A4A4A] mt-1">
            Visão geral das suas turmas e atividades.
          </p>
        </div>
        <Button href="/professor/atividade/nova" variant="primary" size="md">
          <Image src="/icons/play-white.svg" alt="" width={18} height={18} />
          Nova Atividade
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm"
          >
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${stat.color}`}
            >
              {stat.icon === "users" && (
                <Image
                  src="/icons/users-purple.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              )}
              {stat.icon === "check" && (
                <Image
                  src="/icons/check-square-orange.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              )}
              {stat.icon === "calendar" && (
                <Image
                  src="/icons/calendar-green.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              )}
            </div>
            <p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p>
            <p className="text-sm text-[#4A4A4A]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">
            Submissões Recentes
          </h2>
          <p className="text-sm text-[#4A4A4A] mb-6">
            Atividades aguardando o seu feedback
          </p>
          <div className="divide-y divide-gray-100">
            {carregando ? (
              <p className="text-sm text-[#4A4A4A] py-4">Carregando…</p>
            ) : submissoesRecentes.length === 0 ? (
              <p className="text-sm text-[#4A4A4A] py-4">
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
                        <span className="text-sm font-medium text-[#4A4A4A]">
                          {inicial}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1A1A] truncate">
                          {sub.aluno?.nome ?? "Aluno"}
                        </p>
                        <p className="text-sm text-[#4A4A4A] truncate">
                          {sub.atividadeTitulo} • {sub.turmaNome}
                        </p>
                        <p className="text-xs text-[#4A4A4A] mt-0.5">
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

        <div className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">
            Minhas Turmas
          </h2>
          <div className="space-y-4">
            {carregando ? (
              <p className="text-sm text-[#4A4A4A]">Carregando…</p>
            ) : turmas.length === 0 ? (
              <p className="text-sm text-[#4A4A4A]">
                Você ainda não criou turmas.{" "}
                <Link
                  href="/professor/turmas/nova"
                  className="text-[#1898DC] font-medium hover:text-[#147EB8]"
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
                    <p className="font-medium text-[#1A1A1A]">{cls.nome}</p>
                    <p className="text-sm text-[#4A4A4A]">
                      Código: {cls.codigoConvite}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-sm text-[#4A4A4A]">
                    {cls._count?.matriculas ?? 0} alunos
                  </span>
                </div>
              ))
            )}
          </div>
          <Link
            href="/professor/turmas"
            className="mt-4 inline-block text-sm font-medium text-[#1898DC] hover:text-[#147EB8]"
          >
            Ver todas as turmas
          </Link>
        </div>
      </div>
    </div>
  );
}
