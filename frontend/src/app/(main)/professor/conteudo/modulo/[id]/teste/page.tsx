"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { rotuloHabilidade, type Habilidade } from "@/lib/curso";
import { GabaritoView } from "@/components/conteudo/GabaritoView";
import type { TesteModuloProfessora } from "@/components/conteudo/tipos";

const HABILIDADES: Habilidade[] = ["gramatica_vocabulario", "leitura", "escrita"];

export default function TesteModuloPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [teste, setTeste] = useState<TesteModuloProfessora | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [formaAtiva, setFormaAtiva] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    const res = await apiFetch(`/conteudo/modulos/${id}/teste`).catch(() => null);
    if (!res) {
      setErro("Sem conexão com o servidor.");
      setCarregando(false);
      return;
    }
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!res.ok) {
      setErro(res.status === 404 ? "Módulo não encontrado." : "Não foi possível carregar o teste.");
      setCarregando(false);
      return;
    }
    const data = (await res.json()) as TesteModuloProfessora;
    setTeste(data);
    setFormaAtiva(data.formas[0]?.forma ?? null);
    setCarregando(false);
  }, [id, router]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregar();
    });
  }, [carregar]);

  const forma = teste?.formas.find((f) => f.forma === formaAtiva) ?? null;
  const itens = forma ? [...forma.itens].sort((a, b) => a.ordem - b.ordem) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/professor/conteudo"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-2"
        >
          ← Voltar ao conteúdo
        </Link>
        <h1 className="text-2xl font-bold text-ink">
          Teste do módulo{teste ? `: ${teste.modulo.titulo}` : ""}
        </h1>
        <p className="text-ink-soft mt-1">
          Somente leitura. O aluno faz o teste depois de concluir todas as lições do módulo e precisa de 80% para
          liberar o próximo. Cada nova tentativa usa uma forma diferente da anterior.
        </p>
      </div>

      {erro && <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">{erro}</p>}

      {carregando ? (
        <p className="p-8 rounded-xl bg-white border border-gray-100 text-ink-soft">Carregando teste…</p>
      ) : teste && teste.formas.length === 0 ? (
        <p className="p-8 rounded-xl bg-white border border-gray-100 text-ink-soft">Este módulo ainda não tem teste.</p>
      ) : teste ? (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Formas do teste">
            {teste.formas.map((f) => (
              <button
                key={f.forma}
                type="button"
                role="tab"
                aria-selected={f.forma === formaAtiva}
                onClick={() => setFormaAtiva(f.forma)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  f.forma === formaAtiva
                    ? "bg-accent text-white"
                    : "bg-white border border-gray-200 text-ink hover:bg-gray-50"
                }`}
              >
                Forma {f.forma} ({f.itens.length} itens)
              </button>
            ))}
          </div>

          {forma && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                {HABILIDADES.map((h) => (
                  <span key={h} className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-ink-soft">
                    {rotuloHabilidade[h]}: {itens.filter((i) => i.habilidade === h).length}
                  </span>
                ))}
              </div>
              <ol className="space-y-3">
                {itens.map((item, i) => (
                  <li key={item.id} className="card p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-ink-soft">#{i + 1}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                        {rotuloHabilidade[item.habilidade] ?? item.habilidade}
                      </span>
                    </div>
                    <GabaritoView item={item} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
