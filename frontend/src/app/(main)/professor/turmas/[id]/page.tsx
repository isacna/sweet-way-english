"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, assetUrl } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";

type TurmaDetalhe = {
  id: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  professor: { nome: string };
  atividades: {
    id: number;
    titulo: string;
    descricao: string;
    dataEntrega: string;
  }[];
  materiais: { id: number; titulo: string }[];
  matriculas: { aluno: { id: number; nome: string; email: string } }[];
};

type Submissao = {
  id: number;
  conteudo: string | null;
  arquivoUrl: string | null;
  dataEnvio: string;
  status: string;
  aluno: { nome: string };
  feedback: { comentario: string; nota: number } | null;
};

function TurmaDetalhePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const atividadeDestaque = searchParams.get("atividade");

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoSub, setCarregandoSub] = useState(false);
  const [erro, setErro] = useState("");
  const [feedbackForm, setFeedbackForm] = useState<Record<number, { comentario: string; nota: string }>>({});

  const carregarTurma = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const res = await apiFetch(`/turmas/${id}`);
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (res.status === 404) {
      setErro("Turma não encontrada.");
      setTurma(null);
      setCarregando(false);
      return;
    }
    if (!res.ok) {
      setErro("Erro ao carregar turma.");
      setCarregando(false);
      return;
    }
    const data: TurmaDetalhe = await res.json();
    setTurma(data);
    setCarregando(false);
  }, [id, router]);

  const carregarSubmissoes = useCallback(
    async (atividadeId: string) => {
      setCarregandoSub(true);
      const res = await apiFetch(`/atividades/${atividadeId}/submissoes`);
      if (!res.ok) {
        setSubmissoes([]);
        setCarregandoSub(false);
        return;
      }
      const data: Submissao[] = await res.json();
      setSubmissoes(data);
      setCarregandoSub(false);
    },
    []
  );

  useEffect(() => {
    queueMicrotask(() => {
      void carregarTurma();
    });
  }, [carregarTurma]);

  useEffect(() => {
    queueMicrotask(() => {
      if (atividadeDestaque) {
        void carregarSubmissoes(atividadeDestaque);
      } else {
        setSubmissoes([]);
      }
    });
  }, [atividadeDestaque, carregarSubmissoes]);

  async function enviarFeedback(submissaoId: number) {
    const f = feedbackForm[submissaoId];
    if (!f?.comentario?.trim() || f.nota === "") return;
    const res = await apiFetch(`/submissoes/${submissaoId}/feedback`, {
      method: "POST",
      body: JSON.stringify({
        comentario: f.comentario.trim(),
        nota: f.nota,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao enviar feedback");
      return;
    }
    if (atividadeDestaque) await carregarSubmissoes(atividadeDestaque);
  }

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-[#4A4A4A]">Carregando…</p>
      </div>
    );
  }

  if (erro || !turma) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <p className="text-red-600">{erro || "Turma não encontrada."}</p>
        <Button href="/professor/turmas" variant="secondary" size="md">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <Link
          href="/professor/turmas"
          className="inline-flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#1A1A1A] mb-4"
        >
          ← Todas as turmas
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{turma.nome}</h1>
            <p className="text-[#4A4A4A] mt-1">
              Prof. {turma.professor.nome} · Código{" "}
              <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                {turma.codigoConvite}
              </code>
            </p>
            {turma.descricao && (
              <p className="text-sm text-[#4A4A4A] mt-2">{turma.descricao}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              href={`/professor/atividade/nova?turmaId=${turma.id}`}
              variant="primary"
              size="md"
            >
              <Image src="/icons/play-white.svg" alt="" width={18} height={18} />
              Nova atividade
            </Button>
            <Button
              href={`/professor/materiais?turma=${turma.id}`}
              variant="secondary"
              size="md"
            >
              Materiais
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Alunos</h2>
          {turma.matriculas.length === 0 ? (
            <p className="text-sm text-[#4A4A4A]">
              Nenhum aluno matriculado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {turma.matriculas.map((m) => (
                <li
                  key={m.aluno.id}
                  className="py-3 flex justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-[#1A1A1A]">
                    {m.aluno.nome}
                  </span>
                  <span className="text-[#4A4A4A] truncate">{m.aluno.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Atividades</h2>
          {turma.atividades.length === 0 ? (
            <p className="text-sm text-[#4A4A4A] mb-4">
              Nenhuma atividade. Crie a primeira.
            </p>
          ) : (
            <ul className="space-y-3">
              {turma.atividades.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/professor/turmas/${turma.id}?atividade=${a.id}`}
                    className={`block p-3 rounded-lg border transition-colors ${
                      atividadeDestaque === String(a.id)
                        ? "border-[#8A4FF7] bg-[#8A4FF7]/5"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <p className="font-medium text-[#1A1A1A]">{a.titulo}</p>
                    <p className="text-xs text-[#4A4A4A] mt-1 line-clamp-2">
                      {a.descricao}
                    </p>
                    <p className="text-xs text-[#4A4A4A] mt-2">
                      Entrega:{" "}
                      {new Date(a.dataEntrega).toLocaleString("pt-BR")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {atividadeDestaque && (
        <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">
            Submissões desta atividade
          </h2>
          {carregandoSub ? (
            <p className="text-sm text-[#4A4A4A]">Carregando submissões…</p>
          ) : submissoes.length === 0 ? (
            <p className="text-sm text-[#4A4A4A]">
              Nenhuma submissão ainda.
            </p>
          ) : (
            <div className="space-y-6">
              {submissoes.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-lg border border-gray-100 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-[#1A1A1A]">
                      {s.aluno.nome}
                    </span>
                    <span className="text-xs text-[#4A4A4A]">
                      {tempoRelativoPt(s.dataEnvio)} · {s.status}
                    </span>
                  </div>
                  {s.conteudo && (
                    <p className="text-sm text-[#4A4A4A] whitespace-pre-wrap">
                      {s.conteudo}
                    </p>
                  )}
                  {s.arquivoUrl && (
                    <a
                      href={assetUrl(s.arquivoUrl) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#8A4FF7] font-medium hover:underline"
                    >
                      <Image
                        src="/icons/download.svg"
                        alt=""
                        width={16}
                        height={16}
                      />
                      Baixar anexo do aluno
                    </a>
                  )}
                  {s.feedback ? (
                    <div className="text-sm bg-green-50 border border-green-100 rounded-lg p-3">
                      <p className="font-medium text-green-900">
                        Nota: {s.feedback.nota}
                      </p>
                      <p className="text-green-800 mt-1">{s.feedback.comentario}</p>
                    </div>
                  ) : s.status === "pendente" ? (
                    <div className="space-y-2">
                      <textarea
                        placeholder="Comentário do feedback"
                        value={feedbackForm[s.id]?.comentario ?? ""}
                        onChange={(e) =>
                          setFeedbackForm((prev) => ({
                            ...prev,
                            [s.id]: {
                              comentario: e.target.value,
                              nota: prev[s.id]?.nota ?? "",
                            },
                          }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      />
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          placeholder="Nota"
                          value={feedbackForm[s.id]?.nota ?? ""}
                          onChange={(e) =>
                            setFeedbackForm((prev) => ({
                              ...prev,
                              [s.id]: {
                                comentario: prev[s.id]?.comentario ?? "",
                                nota: e.target.value,
                              },
                            }))
                          }
                          className="w-28 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => enviarFeedback(s.id)}
                          className="px-4 py-2 rounded-lg bg-[#8A4FF7] text-white text-sm font-medium hover:bg-[#7742e0]"
                        >
                          Enviar feedback
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function TurmaDetalhePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-8 text-[#4A4A4A]">Carregando…</div>
      }
    >
      <TurmaDetalhePageContent />
    </Suspense>
  );
}
