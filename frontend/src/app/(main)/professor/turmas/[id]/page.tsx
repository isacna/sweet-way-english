"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AssetPreview } from "@/components/AssetPreview";
import { Button } from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { ArquivoBotao } from "@/components/ArquivoBotao";
import type { ArquivoResumo } from "@/lib/arquivos";
import {
  isoToDatetimeLocalValue,
  rotuloStatusSubmissaoPt,
  tempoRelativoPt,
} from "@/lib/timePt";
import { Download, Play } from "lucide-react";

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
    arquivoObrigatorio?: boolean;
    link?: string | null;
    arquivoUrl?: string | null;
    arquivo?: ArquivoResumo | null;
  }[];
  materiais: { id: number; titulo: string }[];
  matriculas: { aluno: { id: number; nome: string; email: string } }[];
};

type Submissao = {
  id: number;
  conteudo: string | null;
  /** "/api/arquivos/<id>" (privado) */
  arquivoUrl: string | null;
  arquivo: ArquivoResumo | null;
  dataEnvio: string;
  status: string;
  aluno: { id: number; nome: string };
  feedback: { comentario: string; nota: number } | null;
};

function BlocoAnexoAluno({
  arquivoUrl,
  arquivo,
  nomeAluno,
}: {
  arquivoUrl: string;
  arquivo: ArquivoResumo | null;
  nomeAluno: string;
}) {
  return (
    <div className="space-y-3">
      <ArquivoBotao
        url={arquivoUrl}
        nome={arquivo?.nomeOriginal}
        baixar
        className="inline-flex items-center gap-2 text-sm text-accent font-medium hover:underline"
      >
        <Download aria-hidden className="h-[16px] w-[16px] shrink-0" />
        Baixar anexo do aluno
        {arquivo?.nomeOriginal ? ` (${arquivo.nomeOriginal})` : ""}
      </ArquivoBotao>
      <AssetPreview url={arquivoUrl} arquivo={arquivo} title={`Anexo — ${nomeAluno}`} />
    </div>
  );
}

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
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editDataEntrega, setEditDataEntrega] = useState("");
  const [editArquivoObrigatorio, setEditArquivoObrigatorio] = useState(false);
  const [editLink, setEditLink] = useState("");
  const [salvandoGestao, setSalvandoGestao] = useState(false);
  const [gestaoErro, setGestaoErro] = useState("");
  const [statusSubBusy, setStatusSubBusy] = useState<{
    id: number;
    tipo: "aprovado" | "reprovado";
  } | null>(null);

  // Mural de avisos
  type Aviso = { id: number; titulo: string; conteudo: string | null; link: string | null; criadoEm: string };
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [modalAviso, setModalAviso] = useState(false);
  const [avisoTitulo, setAvisoTitulo] = useState("");
  const [avisoConteudo, setAvisoConteudo] = useState("");
  const [avisoLink, setAvisoLink] = useState("");
  const [salvandoAviso, setSalvandoAviso] = useState(false);
  const [avisoErro, setAvisoErro] = useState("");

  const carregarAvisos = useCallback(async () => {
    const res = await apiFetch(`/turmas/${id}/avisos`);
    if (res.ok) setAvisos(await res.json());
  }, [id]);

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
      void carregarAvisos();
    });
  }, [carregarTurma, carregarAvisos]);

  useEffect(() => {
    queueMicrotask(() => {
      if (atividadeDestaque) {
        void carregarSubmissoes(atividadeDestaque);
      } else {
        setSubmissoes([]);
      }
    });
  }, [atividadeDestaque, carregarSubmissoes]);

  useEffect(() => {
    if (!turma || !atividadeDestaque) return;
    const a = turma.atividades.find((x) => String(x.id) === atividadeDestaque);
    if (!a) return;
    /* Sincroniza o formulário ao trocar de atividade ou após recarregar a turma. */
    queueMicrotask(() => {
      setEditTitulo(a.titulo);
      setEditDescricao(a.descricao);
      setEditDataEntrega(isoToDatetimeLocalValue(a.dataEntrega));
      setEditArquivoObrigatorio(Boolean(a.arquivoObrigatorio));
      setEditLink(a.link ?? "");
      setGestaoErro("");
    });
  }, [turma, atividadeDestaque]);

  async function publicarAviso(e: React.FormEvent) {
    e.preventDefault();
    setAvisoErro("");
    setSalvandoAviso(true);
    const res = await apiFetch(`/turmas/${id}/avisos`, {
      method: "POST",
      body: JSON.stringify({
        titulo: avisoTitulo.trim(),
        conteudo: avisoConteudo.trim() || null,
        link: avisoLink.trim() || null,
      }),
    });
    setSalvandoAviso(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAvisoErro(d.error ?? "Erro ao publicar aviso.");
      return;
    }
    setAvisoTitulo("");
    setAvisoConteudo("");
    setAvisoLink("");
    setModalAviso(false);
    void carregarAvisos();
  }

  async function deletarAviso(avisoId: number) {
    await apiFetch(`/turmas/${id}/avisos/${avisoId}`, { method: "DELETE" });
    void carregarAvisos();
  }

  async function salvarGestaoAtividade() {
    if (!atividadeDestaque) return;
    setGestaoErro("");
    setSalvandoGestao(true);
    const res = await apiFetch(`/professor/atividades/${atividadeDestaque}`, {
      method: "PATCH",
      body: JSON.stringify({
        titulo: editTitulo.trim(),
        descricao: editDescricao.trim(),
        dataEntrega: new Date(editDataEntrega).toISOString(),
        arquivoObrigatorio: editArquivoObrigatorio,
        link: editLink.trim() || null,
      }),
    });
    setSalvandoGestao(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setGestaoErro(data.error ?? "Não foi possível salvar.");
      return;
    }
    await carregarTurma();
  }

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

  async function definirStatusSubmissao(
    submissaoId: number,
    status: "aprovado" | "reprovado"
  ) {
    setStatusSubBusy({ id: submissaoId, tipo: status });
    const res = await apiFetch(`/professor/submissoes/${submissaoId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setStatusSubBusy(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Não foi possível atualizar o status.");
      return;
    }
    if (atividadeDestaque) await carregarSubmissoes(atividadeDestaque);
  }

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-ink-soft">Carregando…</p>
      </div>
    );
  }

  if (erro || !turma) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <p className="text-danger-ink">{erro || "Turma não encontrada."}</p>
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
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-4"
        >
          ← Todas as turmas
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">{turma.nome}</h1>
            <p className="text-ink-soft mt-1">
              Prof. {turma.professor.nome} · Código{" "}
              <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                {turma.codigoConvite}
              </code>
            </p>
            {turma.descricao && (
              <p className="text-sm text-ink-soft mt-2">{turma.descricao}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              href={`/professor/atividade/nova?turmaId=${turma.id}`}
              variant="primary"
              size="md"
            >
              <Play aria-hidden className="h-[18px] w-[18px] shrink-0 fill-current" />
              Nova atividade
            </Button>
            <button
              type="button"
              onClick={() => { setModalAviso(true); setAvisoErro(""); }}
              className="inline-flex items-center gap-2 font-semibold rounded-xl border border-line-strong bg-card shadow-sm text-ink min-h-[48px] px-6 py-3 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              📌 Novo aviso
            </button>
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

      {/* Mural de Avisos — lista */}
      {avisos.length > 0 && (
        <section className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Mural de Avisos</h2>
          <ul className="space-y-3">
            {avisos.map((av) => (
              <li key={av.id} className="flex gap-3 p-4 rounded-lg border border-line bg-gray-50">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-ink">{av.titulo}</p>
                  {av.conteudo && (
                    <p className="text-sm text-ink-soft">{av.conteudo}</p>
                  )}
                  {av.link && (
                    <a
                      href={av.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline break-all"
                    >
                      🔗 {av.link}
                    </a>
                  )}
                  <p className="text-xs text-ink-soft">
                    {new Date(av.criadoEm).toLocaleString("pt-BR")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deletarAviso(av.id)}
                  className="text-xs font-medium text-danger hover:text-danger-ink shrink-0 self-start"
                  aria-label="Deletar aviso"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Modal: novo aviso */}
      {modalAviso && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
          onClick={() => setModalAviso(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-card)] bg-card border border-line shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Novo aviso</h2>
              <button
                type="button"
                onClick={() => setModalAviso(false)}
                className="p-2 rounded-lg text-ink-soft hover:bg-gray-100"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <form onSubmit={publicarAviso} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Título *</label>
                <input
                  type="text"
                  value={avisoTitulo}
                  onChange={(e) => setAvisoTitulo(e.target.value)}
                  placeholder="Ex: Aula ao vivo hoje às 19h"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Mensagem <span className="font-normal text-ink-soft">(opcional)</span></label>
                <textarea
                  value={avisoConteudo}
                  onChange={(e) => setAvisoConteudo(e.target.value)}
                  placeholder="Informações adicionais…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Link <span className="font-normal text-ink-soft">(opcional)</span></label>
                <input
                  type="text"
                  value={avisoLink}
                  onChange={(e) => setAvisoLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
              </div>
              {avisoErro && (
                <p className="text-sm text-danger-ink bg-danger-soft px-4 py-2 rounded-2xl font-medium">{avisoErro}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalAviso(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-line-strong bg-card shadow-sm text-sm font-semibold text-ink hover:bg-gray-50 hover:border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAviso || !avisoTitulo.trim()}
                  className="flex-1 px-4 py-3 rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 text-sm font-semibold disabled:opacity-70 transition-[filter]"
                >
                  {salvandoAviso ? "Publicando…" : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink mb-4">Alunos</h2>
          {turma.matriculas.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nenhum aluno matriculado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {turma.matriculas.map((m) => (
                <li
                  key={m.aluno.id}
                  className="py-3 flex justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-ink">
                    {m.aluno.nome}
                  </span>
                  <span className="text-ink-soft truncate">{m.aluno.email}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink mb-4">Atividades</h2>
          {turma.atividades.length === 0 ? (
            <p className="text-sm text-ink-soft mb-4">
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
                        ? "border-accent bg-accent/5"
                        : "border-line hover:border-gray-200"
                    }`}
                  >
                    <p className="font-medium text-ink">{a.titulo}</p>
                    <p className="text-xs text-ink-soft mt-1 line-clamp-2">
                      {a.descricao}
                    </p>
                    <p className="text-xs text-ink-soft mt-2">
                      Entrega:{" "}
                      {new Date(a.dataEntrega).toLocaleString("pt-BR")}
                    </p>
                    {Boolean(a.arquivoObrigatorio) && (
                      <p className="text-xs text-sun-ink mt-1 font-medium">
                        Arquivo obrigatório na entrega
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {atividadeDestaque && (
        <section className="card p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink mb-4">
              Gestão da atividade
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="sm:col-span-2">
                <label
                  htmlFor="gestao-titulo"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Título
                </label>
                <input
                  id="gestao-titulo"
                  type="text"
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line-strong text-sm text-ink bg-card focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="gestao-descricao"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Descrição
                </label>
                <textarea
                  id="gestao-descricao"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-line-strong text-sm text-ink bg-card focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="gestao-data-entrega"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Data e hora de entrega
                </label>
                <input
                  id="gestao-data-entrega"
                  type="datetime-local"
                  value={editDataEntrega}
                  onChange={(e) => setEditDataEntrega(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line-strong text-sm text-ink bg-card focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editArquivoObrigatorio}
                  onChange={(e) => setEditArquivoObrigatorio(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <span className="text-sm text-ink">
                  Exigir arquivo na entrega (submissão sem anexo é bloqueada)
                </span>
              </label>
              <div className="sm:col-span-2">
                <label
                  htmlFor="gestao-link"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Link (opcional)
                </label>
                <input
                  id="gestao-link"
                  type="text"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="https://youtube.com/... ou outro link"
                  className="w-full px-3 py-2 rounded-xl border border-line-strong text-sm text-ink bg-card focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
                {editLink.trim() && (
                  <div className="mt-3">
                    <AssetPreview
                      url={editLink.trim()}
                      tipo="link"
                      title={editTitulo || "Link da atividade"}
                    />
                  </div>
                )}
              </div>
              {(() => {
                const atual = turma.atividades.find((x) => String(x.id) === atividadeDestaque);
                if (!atual?.arquivoUrl) return null;
                return (
                  <div className="sm:col-span-2 space-y-2">
                    <p className="text-sm font-medium text-ink">
                      Anexo da atividade: {atual.arquivo?.nomeOriginal ?? "arquivo"}
                    </p>
                    <AssetPreview url={atual.arquivoUrl} arquivo={atual.arquivo} title={`Anexo — ${atual.titulo}`} />
                  </div>
                );
              })()}
            </div>
            {gestaoErro && (
              <p className="text-sm text-danger-ink mt-3">{gestaoErro}</p>
            )}
            <button
              type="button"
              onClick={() => void salvarGestaoAtividade()}
              disabled={
                salvandoGestao ||
                !editDataEntrega ||
                !editTitulo.trim() ||
                !editDescricao.trim()
              }
              className="mt-4 inline-flex items-center rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 text-sm font-semibold px-4 py-2 disabled:opacity-70"
            >
              {salvandoGestao ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink mb-2">
              Quem já entregou
            </h2>
            <p className="text-sm text-ink-soft mb-4">
              {turma.matriculas.length === 0
                ? "Nenhum aluno matriculado nesta turma."
                : (() => {
                    const ids = new Set(submissoes.map((s) => s.aluno.id));
                    const com = turma.matriculas.filter((m) =>
                      ids.has(m.aluno.id)
                    ).length;
                    const total = turma.matriculas.length;
                    return `${com} de ${total} aluno${total === 1 ? "" : "s"} ${
                      total === 1 ? "já entregou" : "já entregaram"
                    }`;
                  })()}
            </p>
            {turma.matriculas.length === 0 ? null : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {turma.matriculas.map((m) => {
                  const entregou = submissoes.some((s) => s.aluno.id === m.aluno.id);
                  return (
                    <li
                      key={m.aluno.id}
                      className="flex items-center justify-between gap-2 py-2.5 px-3 text-sm"
                    >
                      <span className="font-medium text-ink">
                        {m.aluno.nome}
                      </span>
                      <span
                        className={
                          entregou
                            ? "text-success-ink font-medium"
                            : "text-ink-soft"
                        }
                      >
                        {entregou ? "Entregou" : "Pendente"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink mb-4">
              Submissões desta atividade
            </h2>
            {carregandoSub ? (
              <p className="text-sm text-ink-soft">Carregando submissões…</p>
            ) : submissoes.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Nenhuma submissão ainda.
              </p>
            ) : (
              <div className="space-y-6">
                {submissoes.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-lg border border-line space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink">
                        {s.aluno.nome}
                      </span>
                      <span className="text-xs text-ink-soft">
                        {tempoRelativoPt(s.dataEnvio)} ·{" "}
                        {rotuloStatusSubmissaoPt(s.status)}
                      </span>
                    </div>
                    {s.conteudo && (
                      <p className="text-sm text-ink-soft whitespace-pre-wrap">
                        {s.conteudo}
                      </p>
                    )}
                    {s.arquivoUrl && (
                      <BlocoAnexoAluno
                        arquivoUrl={s.arquivoUrl}
                        arquivo={s.arquivo}
                        nomeAluno={s.aluno.nome}
                      />
                    )}
                    {s.feedback ? (
                      <div className="text-sm bg-success-soft border border-success-bright/30 rounded-lg p-3">
                        <p className="font-medium text-success-ink">
                          Nota: {s.feedback.nota}
                        </p>
                        <p className="text-success-ink mt-1">{s.feedback.comentario}</p>
                      </div>
                    ) : null}
                    {!s.feedback && s.status === "pendente" ? (
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
                          className="w-full px-3 py-2 rounded-xl border border-line-strong text-sm bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
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
                            className="w-28 px-3 py-2 rounded-xl border border-line-strong text-sm bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() => enviarFeedback(s.id)}
                            className="px-4 py-2 rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 text-sm font-semibold"
                          >
                            Enviar feedback
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {(s.status === "aprovado" || s.status === "reprovado") && (
                      <p className="text-xs text-ink-soft border border-line rounded-lg px-3 py-2 bg-gray-50">
                        {s.status === "aprovado"
                          ? "Esta entrega foi aprovada. A avaliação com Aprovar/Reprovar não pode ser alterada."
                          : "Esta entrega foi reprovada. O aluno pode enviar nova versão. Esta decisão não pode ser alterada."}
                      </p>
                    )}
                    {s.status === "pendente" && (
                      <div
                        className="flex flex-wrap gap-2 pt-1"
                        role="group"
                        aria-label="Decisão sobre a entrega"
                      >
                        <button
                          type="button"
                          disabled={
                            statusSubBusy !== null && statusSubBusy.id === s.id
                          }
                          onClick={() =>
                            void definirStatusSubmissao(s.id, "aprovado")
                          }
                          className="px-3 py-1.5 rounded-lg border border-success text-success-ink text-sm font-medium hover:bg-success-soft transition-colors disabled:opacity-60"
                        >
                          {statusSubBusy?.id === s.id &&
                          statusSubBusy.tipo === "aprovado"
                            ? "…"
                            : "Aprovar"}
                        </button>
                        <button
                          type="button"
                          disabled={
                            statusSubBusy !== null && statusSubBusy.id === s.id
                          }
                          onClick={() =>
                            void definirStatusSubmissao(s.id, "reprovado")
                          }
                          className="px-3 py-1.5 rounded-lg border border-danger-bright/40 text-danger-ink text-sm font-medium hover:bg-danger-soft transition-colors disabled:opacity-60"
                        >
                          {statusSubBusy?.id === s.id &&
                          statusSubBusy.tipo === "reprovado"
                            ? "…"
                            : "Reprovar"}
                        </button>
                      </div>
                    )}
                    {s.status === "corrigido" && s.feedback && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={
                            statusSubBusy !== null && statusSubBusy.id === s.id
                          }
                          onClick={() =>
                            void definirStatusSubmissao(s.id, "reprovado")
                          }
                          className="px-3 py-1.5 rounded-lg border border-danger-bright/40 text-danger-ink text-sm font-medium hover:bg-danger-soft transition-colors disabled:opacity-60"
                        >
                          {statusSubBusy?.id === s.id &&
                          statusSubBusy.tipo === "reprovado"
                            ? "…"
                            : "Reprovar (remove nota e libera nova entrega)"}
                        </button>
                        <span className="text-xs text-ink-soft">
                          Só é possível reprovar para pedir nova entrega; a nota
                          não pode ser alterada de outro modo.
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default function TurmaDetalhePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-8 text-ink-soft">Carregando…</div>
      }
    >
      <TurmaDetalhePageContent />
    </Suspense>
  );
}
