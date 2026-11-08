"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { FiltroLista } from "@/components/FiltroLista";
import { apiFetch } from "@/lib/api";
import { Plus, UsersRound } from "lucide-react";

type Turma = {
  id: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  criadoEm: string;
  _count?: { matriculas: number };
};

export default function TurmasPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const turmasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return turmas;
    return turmas.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) ||
        t.descricao?.toLowerCase().includes(q),
    );
  }, [turmas, busca]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await apiFetch("/turmas");
      if (cancelled) return;

      if (res.status === 401 || res.status === 403) {
        router.replace("/login?tipo=professor");
        return;
      }
      if (!res.ok) {
        setErro("Não foi possível carregar as turmas.");
        setCarregando(false);
        return;
      }
      const data: Turma[] = await res.json();
      if (cancelled) return;
      setTurmas(data);
      setErro("");
      setCarregando(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Minhas Turmas</h1>
          <p className="text-ink-soft mt-1">
            Gerencie seus alunos e materiais por turma.
          </p>
        </div>
        <Button href="/professor/turmas/nova" variant="primary" size="md">
          <Plus aria-hidden className="h-[18px] w-[18px] shrink-0" />
          Nova Turma
        </Button>
      </div>

      {erro && (
        <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">
          {erro}
        </p>
      )}

      {!carregando && turmas.length > 0 && (
        <FiltroLista
          busca={busca}
          onBuscaChange={setBusca}
          placeholderBusca="Buscar por nome ou descrição…"
          total={turmas.length}
          totalFiltrado={turmasFiltradas.length}
        />
      )}

      {carregando ? (
        <p className="text-ink-soft">Carregando turmas…</p>
      ) : turmas.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-line text-center">
          <p className="text-ink-soft mb-4">Nenhuma turma ainda.</p>
          <Button href="/professor/turmas/nova" variant="primary" size="md">
            Criar primeira turma
          </Button>
        </div>
      ) : turmasFiltradas.length === 0 ? (
        <p className="text-ink-soft text-sm">
          Nenhuma turma encontrada para &ldquo;{busca}&rdquo;.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmasFiltradas.map((cls) => (
            <article
              key={cls.id}
              className="card p-6 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-ink">{cls.nome}</h3>
              </div>
              {cls.descricao && (
                <p className="text-sm text-ink-soft mb-3 line-clamp-2">
                  {cls.descricao}
                </p>
              )}
              <div className="space-y-3 text-sm text-ink-soft mb-4">
                <p className="flex items-center gap-2">
                  <UsersRound aria-hidden className="h-[16px] w-[16px] shrink-0" />
                  {cls._count?.matriculas ?? 0} alunos
                </p>
                <p>
                  <span className="font-medium text-ink">Código: </span>
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {cls.codigoConvite}
                  </code>
                </p>
                <p className="text-xs">
                  Criada em{" "}
                  {new Date(cls.criadoEm).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <Button
                  href={`/professor/turmas/${cls.id}`}
                  variant="secondary"
                  size="md"
                >
                  Acessar Turma
                </Button>
                <Link
                  href={`/professor/materiais?turma=${cls.id}`}
                  className="text-center text-sm font-medium text-accent hover:text-accent-strong"
                >
                  Materiais desta turma
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
