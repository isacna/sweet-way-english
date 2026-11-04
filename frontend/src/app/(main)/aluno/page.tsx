"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { ContinuarCursoCard } from "@/components/curso/ContinuarCursoCard";
import { apiFetch, apiPaths, getStoredUser } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";
import { CalendarDays, Plus, SquareCheckBig, UsersRound } from "lucide-react";

type Turma = {
  id: number;
  nome: string;
  professor?: { nome: string };
};

type FeedbackItem = {
  id: number;
  comentario: string;
  nota: number;
  criadoEm: string;
  professor: { nome: string };
  submissao: { atividade: { titulo: string } };
};

type LinhaPrazo = {
  atividadeId: number;
  turmaId: number;
  turmaNome: string;
  titulo: string;
  dataEntrega: string;
  situacao:
    | "a_entregar"
    | "aguardando"
    | "corrigida"
    | "aprovada"
    | "reprovada";
};

function situacaoLabel(s: LinhaPrazo["situacao"]) {
  if (s === "a_entregar") return "A entregar";
  if (s === "aguardando") return "Aguardando correção";
  if (s === "aprovada") return "Aprovada";
  if (s === "reprovada") return "Reprovada";
  return "Corrigida";
}

export default function AlunoDashboardPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [prazos, setPrazos] = useState<LinhaPrazo[]>([]);
  const [aEntregar, setAEntregar] = useState(0);

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }

    let cancelled = false;

    async function load() {
      const resTurmas = await apiFetch("/turmas");
      if (cancelled) return;
      if (resTurmas.status === 401 || resTurmas.status === 403) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!resTurmas.ok) {
        setCarregando(false);
        return;
      }
      const listaTurmas: Turma[] = await resTurmas.json();

      const resFb = await apiFetch(apiPaths.alunoMeFeedbacks);
      if (cancelled) return;
      const listaFb: FeedbackItem[] = resFb.ok ? await resFb.json() : [];

      const linhas: LinhaPrazo[] = [];
      let entregar = 0;

      await Promise.all(
        listaTurmas.map(async (t) => {
          const r = await apiFetch(`/turmas/${t.id}/atividades`);
          if (!r.ok || cancelled) return;
          const atividades: {
            id: number;
            titulo: string;
            dataEntrega: string;
            submissoes: { status: string }[];
          }[] = await r.json();

          for (const a of atividades) {
            const subs = a.submissoes ?? [];
            const ultima = subs[0];
            let situacao: LinhaPrazo["situacao"];
            if (subs.length === 0) {
              situacao = "a_entregar";
              entregar += 1;
            } else if (ultima.status === "corrigido") {
              situacao = "corrigida";
            } else if (ultima.status === "aprovado") {
              situacao = "aprovada";
            } else if (ultima.status === "reprovado") {
              situacao = "reprovada";
            } else {
              situacao = "aguardando";
            }
            linhas.push({
              atividadeId: a.id,
              turmaId: t.id,
              turmaNome: t.nome,
              titulo: a.titulo,
              dataEntrega: a.dataEntrega,
              situacao,
            });
          }
        })
      );

      if (cancelled) return;
      linhas.sort(
        (x, y) =>
          new Date(x.dataEntrega).getTime() - new Date(y.dataEntrega).getTime()
      );

      setTurmas(listaTurmas);
      setFeedbacks(listaFb);
      setPrazos(linhas);
      setAEntregar(entregar);
      setCarregando(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const feedbacksRecentes = feedbacks
    .slice()
    .sort(
      (a, b) =>
        new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    )
    .slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Olá! Seu painel
          </h1>
          <p className="text-ink-soft mt-1">
            Turmas, prazos e feedbacks dos professores.
          </p>
        </div>
        {!carregando && turmas.length === 0 && (
          <Button href="/aluno/turmas" variant="primary" size="md">
            <Plus aria-hidden className="h-[18px] w-[18px] shrink-0" />
            Entrar em turma
          </Button>
        )}
      </div>

      <ContinuarCursoCard />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-6">
        {[
          {
            label: "Minhas turmas",
            value: carregando ? "…" : String(turmas.length),
            icon: "users" as const,
            color: "bg-accent/10 text-accent",
          },
          {
            label: "Atividades a entregar",
            value: carregando ? "…" : String(aEntregar),
            icon: "check" as const,
            color: "bg-orange-100 text-orange-600",
          },
          {
            label: "Feedbacks recebidos",
            value: carregando ? "…" : String(feedbacks.length),
            icon: "calendar" as const,
            color: "bg-green-100 text-green-600",
          },
        ].map((stat) => (
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
            Prazos e status
          </h2>
          <p className="text-sm text-ink-soft mb-4">
            Por data de entrega
          </p>
          {carregando ? (
            <p className="text-sm text-ink-soft">Carregando…</p>
          ) : prazos.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nenhuma atividade. Entre em uma turma com código de convite.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {prazos.slice(0, 8).map((p) => (
                <li
                  key={`${p.turmaId}-${p.atividadeId}`}
                  className="py-3 first:pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">
                      {p.titulo}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {p.turmaNome} · Entrega{" "}
                      {new Date(p.dataEntrega).toLocaleString("pt-BR")}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.situacao === "a_entregar"
                          ? "bg-orange-100 text-orange-800"
                          : p.situacao === "aguardando"
                            ? "bg-blue-50 text-blue-800"
                            : p.situacao === "reprovada"
                              ? "bg-red-50 text-red-800"
                              : p.situacao === "aprovada"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-green-50 text-green-800"
                      }`}
                    >
                      {situacaoLabel(p.situacao)}
                    </span>
                  </div>
                  <Link
                    href={`/aluno/atividades/${p.atividadeId}?turmaId=${p.turmaId}`}
                    className="text-sm font-medium text-accent hover:text-accent-strong shrink-0"
                  >
                    {p.situacao === "a_entregar" ||
                    p.situacao === "aguardando"
                      ? "Abrir"
                      : "Ver"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-ink mb-1">
            Feedbacks recentes
          </h2>
          <p className="text-sm text-ink-soft mb-4">
            Notas e comentários dos professores
          </p>
          {carregando ? (
            <p className="text-sm text-ink-soft">Carregando…</p>
          ) : feedbacksRecentes.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Ainda não há feedbacks nas suas entregas.
            </p>
          ) : (
            <ul className="space-y-4">
              {feedbacksRecentes.map((f) => (
                <li
                  key={f.id}
                  className="p-3 rounded-lg border border-gray-100 bg-gray-50/80"
                >
                  <p className="text-sm font-medium text-ink">
                    {f.submissao.atividade.titulo}
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {f.professor.nome} · Nota {f.nota} ·{" "}
                    {tempoRelativoPt(f.criadoEm)}
                  </p>
                  <p className="text-sm text-ink-soft mt-2 line-clamp-2">
                    {f.comentario}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/aluno/feedbacks"
            className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-strong"
          >
            Ver todos os feedbacks
          </Link>
        </div>
      </div>
    </div>
  );
}
