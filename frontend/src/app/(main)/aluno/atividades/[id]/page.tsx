"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, assetUrl, getStoredUser } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";

type Atividade = {
  id: number;
  titulo: string;
  descricao: string;
  dataEntrega: string;
  submissoes: {
    id: number;
    conteudo: string | null;
    arquivoUrl: string | null;
    dataEnvio: string;
    status: string;
  }[];
};

function AtividadeEntregaContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const atividadeId = params.id as string;
  const turmaId = searchParams.get("turmaId") ?? "";

  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [conteudo, setConteudo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }
    if (!turmaId) {
      setCarregando(false);
      setErro("Falta o parâmetro da turma. Abra a atividade a partir da turma.");
      return;
    }

    let cancelled = false;

    async function load() {
      const res = await apiFetch(`/turmas/${turmaId}/atividades`);
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!res.ok) {
        setErro("Não foi possível carregar a atividade.");
        setCarregando(false);
        return;
      }
      const lista: Atividade[] = await res.json();
      const found = lista.find((a) => String(a.id) === String(atividadeId));
      if (!found) {
        setErro("Atividade não encontrada nesta turma.");
        setCarregando(false);
        return;
      }
      setAtividade(found);
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [atividadeId, turmaId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOkMsg("");
    if (!atividade) return;
    if (!conteudo.trim() && !arquivo) {
      setErro("Escreva algo na resposta ou anexe um arquivo.");
      return;
    }
    setEnviando(true);
    const fd = new FormData();
    fd.append("conteudo", conteudo.trim() || "");
    if (arquivo) fd.append("arquivo", arquivo);

    const res = await apiFetch(`/atividades/${atividade.id}/submissoes`, {
      method: "POST",
      body: fd,
    });
    setEnviando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(data.error ?? "Erro ao enviar.");
      return;
    }
    setOkMsg("Entrega registrada com sucesso.");
    setConteudo("");
    setArquivo(null);

    const res2 = await apiFetch(`/turmas/${turmaId}/atividades`);
    if (res2.ok) {
      const lista: Atividade[] = await res2.json();
      const found = lista.find((a) => String(a.id) === String(atividadeId));
      if (found) setAtividade(found);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-[#4A4A4A]">Carregando…</p>
      </div>
    );
  }

  if (erro && !atividade) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-red-600">{erro}</p>
        <Button href="/aluno/turmas" variant="secondary" size="md">
          Turmas
        </Button>
      </div>
    );
  }

  if (!atividade) return null;

  const ultima = atividade.submissoes?.[0];
  const voltarHref = `/aluno/turmas/${turmaId}`;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#1A1A1A] mb-4"
        >
          ← Voltar à turma
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{atividade.titulo}</h1>
        <p className="text-sm text-[#4A4A4A] mt-2">
          Prazo: {new Date(atividade.dataEntrega).toLocaleString("pt-BR")}
        </p>
        <div className="mt-4 p-4 rounded-xl bg-white border border-gray-100 text-sm text-[#4A4A4A] whitespace-pre-wrap">
          {atividade.descricao}
        </div>
      </div>

      {ultima && (
        <section className="p-5 rounded-xl bg-[#F8F9FA] border border-gray-200">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-2">
            Sua última entrega
          </h2>
          <p className="text-xs text-[#4A4A4A] mb-2">
            {tempoRelativoPt(ultima.dataEnvio)} · {ultima.status}
          </p>
          {ultima.conteudo && (
            <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">
              {ultima.conteudo}
            </p>
          )}
          {ultima.arquivoUrl && (
            <a
              href={assetUrl(ultima.arquivoUrl) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#8A4FF7] mt-2"
            >
              <Image src="/icons/download.svg" alt="" width={16} height={16} />
              Arquivo enviado
            </a>
          )}
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-bold text-[#1A1A1A]">
          {ultima ? "Nova entrega" : "Sua resposta"}
        </h2>
        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          rows={6}
          placeholder="Escreva sua resposta aqui…"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#8A4FF7]/20"
        />
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Anexo (opcional)
          </label>
          <input
            type="file"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-[#4A4A4A]"
          />
        </div>
        {erro && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {erro}
          </p>
        )}
        {okMsg && (
          <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            {okMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center gap-2 rounded-lg bg-[#8A4FF7] text-white font-medium px-6 py-3 hover:bg-[#7742e0] disabled:opacity-70"
        >
          <Image src="/icons/upload-white.svg" alt="" width={18} height={18} />
          {enviando ? "Enviando…" : "Enviar entrega"}
        </button>
      </form>
    </div>
  );
}

export default function AlunoAtividadePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto p-8 text-[#4A4A4A]">Carregando…</div>
      }
    >
      <AtividadeEntregaContent />
    </Suspense>
  );
}
