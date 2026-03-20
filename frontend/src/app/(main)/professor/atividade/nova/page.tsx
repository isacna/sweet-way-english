"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch } from "@/lib/api";

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
    carregarTurmas();
  }, [carregarTurmas]);

  useEffect(() => {
    if (turmaIdInicial) setTurmaId(turmaIdInicial);
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
          className="inline-flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#1A1A1A] mb-4"
        >
          ← Painel
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Nova atividade</h1>
        <p className="text-[#4A4A4A] mt-1">
          A atividade ficará visível para todos os alunos da turma.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm space-y-5"
      >
        <div>
          <label
            htmlFor="turma"
            className="block text-sm font-medium text-[#1A1A1A] mb-2"
          >
            Turma
          </label>
          <select
            id="turma"
            required
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            disabled={carregandoTurmas || turmas.length === 0}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#8A4FF7]/20 focus:border-[#8A4FF7] disabled:bg-gray-50"
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
            <p className="text-sm text-[#4A4A4A] mt-2">
              Crie uma turma antes.{" "}
              <Link href="/professor/turmas/nova" className="text-[#8A4FF7]">
                Nova turma
              </Link>
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="titulo"
            className="block text-sm font-medium text-[#1A1A1A] mb-2"
          >
            Título
          </label>
          <input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#8A4FF7]/20 focus:border-[#8A4FF7]"
          />
        </div>
        <div>
          <label
            htmlFor="descricao"
            className="block text-sm font-medium text-[#1A1A1A] mb-2"
          >
            Descrição / instruções
          </label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#8A4FF7]/20 focus:border-[#8A4FF7]"
          />
        </div>
        <div>
          <label
            htmlFor="dataEntrega"
            className="block text-sm font-medium text-[#1A1A1A] mb-2"
          >
            Data e hora de entrega
          </label>
          <input
            id="dataEntrega"
            type="datetime-local"
            value={dataEntrega}
            onChange={(e) => setDataEntrega(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#8A4FF7]/20 focus:border-[#8A4FF7]"
          />
        </div>
        {erro && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
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
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-[#8A4FF7] text-white px-6 py-3 hover:bg-[#7742e0] transition-colors disabled:opacity-70"
          >
            {carregando ? (
              "Salvando…"
            ) : (
              <>
                <Image src="/icons/play-white.svg" alt="" width={18} height={18} />
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
        <div className="max-w-lg mx-auto p-8 text-[#4A4A4A]">Carregando…</div>
      }
    >
      <NovaAtividadePageContent />
    </Suspense>
  );
}
