"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AssetPreview } from "@/components/AssetPreview";
import { Button } from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { Play } from "lucide-react";

type Turma = { id: number; nome: string };

function NovaAtividadePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turmaIdInicial = searchParams.get("turmaId") ?? "";

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState(turmaIdInicial);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [arquivoObrigatorio, setArquivoObrigatorio] = useState(false);
  const [link, setLink] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);

  const carregarTurmas = useCallback(async () => {
    setCarregandoTurmas(true);
    const res = await apiFetch("/turmas");
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (res.ok) {
      const data: Turma[] = await res.json();
      setTurmas(data);
      if (!turmaIdInicial && data.length === 1) {
        setTurmaId(String(data[0].id));
      }
    }
    setCarregandoTurmas(false);
  }, [router, turmaIdInicial]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarTurmas();
    });
  }, [carregarTurmas]);

  useEffect(() => {
    if (!turmaIdInicial) return;
    queueMicrotask(() => {
      setTurmaId(turmaIdInicial);
    });
  }, [turmaIdInicial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!turmaId) {
      setErro("Selecione uma turma.");
      return;
    }
    setCarregando(true);
    const res = await apiFetch(`/turmas/${turmaId}/atividades`, {
      method: "POST",
      body: JSON.stringify({
        titulo,
        descricao,
        dataEntrega: new Date(dataEntrega).toISOString(),
        arquivoObrigatorio,
        link: link.trim() || null,
      }),
    });
    setCarregando(false);
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(data.error ?? "Erro ao criar atividade");
      return;
    }
    router.push(`/professor/turmas/${turmaId}?atividade=${data.id}`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <Link
          href="/professor"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-4"
        >
          ← Painel
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Nova atividade</h1>
        <p className="text-ink-soft mt-1">
          A atividade ficará visível para todos os alunos da turma.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card p-6 space-y-5"
      >
        <div>
          <label
            htmlFor="turma"
            className="block text-sm font-medium text-ink mb-2"
          >
            Turma
          </label>
          <select
            id="turma"
            required
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            disabled={carregandoTurmas || turmas.length === 0}
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent disabled:bg-gray-50"
          >
            <option value="">
              {carregandoTurmas ? "Carregando…" : "Selecione a turma"}
            </option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          {!carregandoTurmas && turmas.length === 0 && (
            <p className="text-sm text-ink-soft mt-2">
              Crie uma turma antes.{" "}
              <Link href="/professor/turmas/nova" className="text-accent">
                Nova turma
              </Link>
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="titulo"
            className="block text-sm font-medium text-ink mb-2"
          >
            Título
          </label>
          <input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </div>
        <div>
          <label
            htmlFor="descricao"
            className="block text-sm font-medium text-ink mb-2"
          >
            Descrição / instruções
          </label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </div>
        <div>
          <label
            htmlFor="dataEntrega"
            className="block text-sm font-medium text-ink mb-2"
          >
            Data e hora de entrega
          </label>
          <input
            id="dataEntrega"
            type="datetime-local"
            value={dataEntrega}
            onChange={(e) => setDataEntrega(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={arquivoObrigatorio}
            onChange={(e) => setArquivoObrigatorio(e.target.checked)}
            className="mt-1 rounded border-gray-300 text-accent focus:ring-accent"
          />
          <span className="text-sm text-ink">
            Exigir arquivo na entrega (alunos precisam anexar um arquivo para enviar)
          </span>
        </label>
        <div>
          <label
            htmlFor="link"
            className="block text-sm font-medium text-ink mb-2"
          >
            Link (opcional)
          </label>
          <input
            id="link"
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://youtube.com/... ou outro link"
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
          {link.trim() && (
            <div className="mt-3">
              <AssetPreview
                fullUrl={link.trim()}
                tipo="link"
                title={titulo || "Link da atividade"}
              />
            </div>
          )}
        </div>
        {erro && (
          <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">
            {erro}
          </p>
        )}
        <div className="flex gap-3">
          <Button href="/professor" variant="secondary" size="md">
            Cancelar
          </Button>
          <button
            type="submit"
            disabled={carregando || turmas.length === 0}
            className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 px-6 py-3 transition-[filter] disabled:opacity-70"
          >
            {carregando ? (
              "Salvando…"
            ) : (
              <>
                <Play aria-hidden className="h-[18px] w-[18px] shrink-0 fill-current" />
                Publicar atividade
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NovaAtividadePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto p-8 text-ink-soft">Carregando…</div>
      }
    >
      <NovaAtividadePageContent />
    </Suspense>
  );
}
