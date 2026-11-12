"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { classeLinkAcao, Secao } from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";
import type { Conquista } from "@/lib/curso";
import { proximaConquista } from "./apoio";
import { DiscoMedalha, ProgressoConquista } from "./Medalha";

/**
 * Seção compacta do painel do aluno: as 3 conquistas mais altas já obtidas e a próxima a caminho.
 * A lista vem em ordem de dificuldade (não há data de obtenção), então "mais altas" = as últimas obtidas da lista.
 * Se a chamada falhar, a seção simplesmente não aparece.
 */
export function ResumoConquistas() {
  const [conquistas, setConquistas] = useState<Conquista[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch("/curso/conquistas").catch(() => null);
      if (cancelled || !res?.ok) return;
      const dados = (await res.json()) as { conquistas: Conquista[] };
      if (!cancelled) setConquistas(dados.conquistas);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!conquistas || conquistas.length === 0) return null;

  const obtidas = conquistas.filter((c) => c.obtida);
  const recentes = obtidas.slice(-3).reverse();
  const proxima = proximaConquista(conquistas);

  return (
    <Secao
      id="conquistas"
      titulo={
        <span className="inline-flex items-center gap-2">
          <Award aria-hidden className="h-5 w-5 text-grape" />
          Conquistas
        </span>
      }
      descricao={
        obtidas.length === 0
          ? "A primeira vem com a sua primeira lição."
          : `${obtidas.length} de ${conquistas.length} conquistadas`
      }
      acao={
        <Link href="/aluno/curso/conquistas" className={classeLinkAcao}>
          Ver todas
        </Link>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {recentes.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-3">
            {recentes.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <DiscoMedalha conquista={c} tamanho="sm" />
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-ink">{c.titulo}</p>
                  <p className="text-xs text-ink-soft">Conquistada</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {proxima && (
          <div
            className={`flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-3 ${
              recentes.length === 0 ? "lg:col-span-2" : ""
            }`}
          >
            <DiscoMedalha conquista={proxima} tamanho="sm" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-ink-faint">Próxima</p>
              <p className="font-semibold leading-snug text-ink">{proxima.titulo}</p>
              {proxima.progresso ? (
                <ProgressoConquista conquista={proxima} />
              ) : (
                <p className="text-xs text-ink-soft">{proxima.descricao}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Secao>
  );
}
