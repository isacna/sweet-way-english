"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, apiPaths, getStoredUser } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";

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
  situacao: "a_entregar" | "aguardando" | "corrigida";
};

function situacaoLabel(s: LinhaPrazo["situacao"]) {
  if (s === "a_entregar") return "A entregar";
  if (s === "aguardando") return "Aguardando correção";
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
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Olá! Seu painel
          </h1>
          <p className="text-[#4A4A4A] mt-1">
            Turmas, prazos e feedbacks dos professores.
          </p>
        </div>
        {!carregando && turmas.length === 0 && (
          <Button href="/aluno/turmas" variant="primary" size="md">
            <Image src="/icons/plus-white.svg" alt="" width={18} height={18} />
            Entrar em turma
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {[
          {
            label: "Minhas turmas",
            value: carregando ? "…" : String(turmas.length),
            icon: "users" as const,
            color: "bg-[#8A4FF7]/10 text-[#8A4FF7]",
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
            Prazos e status
          </h2>
          <p className="text-sm text-[#4A4A4A] mb-4">
            Por data de entrega
          </p>
          {carregando ? (
            <p className="text-sm text-[#4A4A4A]">Carregando…</p>
          ) : prazos.length === 0 ? (
            <p className="text-sm text-[#4A4A4A]">
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
                    <p className="font-medium text-[#1A1A1A] truncate">
                      {p.titulo}
                    </p>
                    <p className="text-xs text-[#4A4A4A]">
                      {p.turmaNome} · Entrega{" "}
                      {new Date(p.dataEntrega).toLocaleString("pt-BR")}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.situacao === "a_entregar"
                          ? "bg-orange-100 text-orange-800"
                          : p.situacao === "aguardando"
                            ? "bg-blue-50 text-blue-800"
                            : "bg-green-50 text-green-800"
                      }`}
                    >
                      {situacaoLabel(p.situacao)}
                    </span>
                  </div>
                  <Link
                    href={`/aluno/atividades/${p.atividadeId}?turmaId=${p.turmaId}`}
                    className="text-sm font-medium text-[#8A4FF7] hover:text-[#7742e0] shrink-0"
                  >
                    {p.situacao === "corrigida" ? "Ver" : "Abrir"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">
            Feedbacks recentes
          </h2>
          <p className="text-sm text-[#4A4A4A] mb-4">
            Notas e comentários dos professores
          </p>
          {carregando ? (
            <p className="text-sm text-[#4A4A4A]">Carregando…</p>
          ) : feedbacksRecentes.length === 0 ? (
            <p className="text-sm text-[#4A4A4A]">
              Ainda não há feedbacks nas suas entregas.
            </p>
          ) : (
            <ul className="space-y-4">
              {feedbacksRecentes.map((f) => (
                <li
                  key={f.id}
                  className="p-3 rounded-lg border border-gray-100 bg-[#F8F9FA]/80"
                >
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    {f.submissao.atividade.titulo}
                  </p>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    {f.professor.nome} · Nota {f.nota} ·{" "}
                    {tempoRelativoPt(f.criadoEm)}
                  </p>
                  <p className="text-sm text-[#4A4A4A] mt-2 line-clamp-2">
                    {f.comentario}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/aluno/feedbacks"
            className="mt-4 inline-block text-sm font-medium text-[#8A4FF7] hover:text-[#7742e0]"
          >
            Ver todos os feedbacks
          </Link>
        </div>
      </div>
    </div>
  );
}
