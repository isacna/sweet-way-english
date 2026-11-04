"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { Plus } from "lucide-react";

const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export default function NovaTurmaPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nivel, setNivel] = useState<string>("B1");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const res = await apiFetch("/turmas", {
      method: "POST",
      body: JSON.stringify({ nome, descricao: descricao || undefined, nivel }),
    });
    setCarregando(false);
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(data.error ?? "Erro ao criar turma");
      return;
    }
    router.push(`/professor/turmas/${data.id}`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <Link
          href="/professor/turmas"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-4"
        >
          ← Voltar às turmas
        </Link>
        <h1 className="text-2xl font-bold text-ink">Nova turma</h1>
        <p className="text-ink-soft mt-1">
          Um código de convite será gerado automaticamente.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card p-6 space-y-5"
      >
        <div>
          <label
            htmlFor="nome"
            className="block text-sm font-medium text-ink mb-2"
          >
            Nome da turma
          </label>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Ex.: Inglês B1 — Tarde"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label
            htmlFor="descricao"
            className="block text-sm font-medium text-ink mb-2"
          >
            Descrição (opcional)
          </label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div>
          <label
            htmlFor="nivel"
            className="block text-sm font-medium text-ink mb-2"
          >
            Nível (prefixo do código de convite)
          </label>
          <select
            id="nivel"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {erro && (
          <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">
            {erro}
          </p>
        )}
        <div className="flex gap-3">
          <Button href="/professor/turmas" variant="secondary" size="md">
            Cancelar
          </Button>
          <button
            type="submit"
            disabled={carregando}
            className="inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-accent text-white px-6 py-3 hover:bg-accent-strong transition-colors disabled:opacity-70"
          >
            {carregando ? (
              "Salvando…"
            ) : (
              <>
                <Plus aria-hidden className="h-[18px] w-[18px] shrink-0" />
                Criar turma
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
