"use client";

import { useMemo } from "react";
import type { PropsRenderizador } from "./tipos";

/** Embaralhamento determinístico (o mesmo exercício aparece sempre igual, sem Math.random no render). */
function embaralhar<T>(lista: T[], semente: number): T[] {
  const r = [...lista];
  let s = Math.abs(semente) % 233280;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Ordenar palavras: toque nas palavras do banco para montar a frase; toque na frase para remover. */
export function ExercicioWordOrder({ id, conteudo, value, onChange, disabled }: PropsRenderizador<"word_order">) {
  const banco = useMemo(() => embaralhar(conteudo.palavras, id), [conteudo.palavras, id]);
  const frase = useMemo<string[]>(() => (Array.isArray(value) ? (value as string[]) : []), [value]);

  // Posições do banco já usadas (palavras repetidas são intercambiáveis)
  const usadas = useMemo(() => {
    const marcadas = new Set<number>();
    for (const palavra of frase) {
      const idx = banco.findIndex((p, i) => p === palavra && !marcadas.has(i));
      if (idx >= 0) marcadas.add(idx);
    }
    return marcadas;
  }, [banco, frase]);

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Frase montada"
        className="flex min-h-[4.25rem] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-grape/45 bg-grape-mist p-3"
      >
        {frase.length === 0 && (
          <span className="px-1 text-sm text-ink-faint">Toque nas palavras abaixo para montar a frase.</span>
        )}
        {frase.map((palavra, i) => (
          <button
            key={`${palavra}-${i}`}
            type="button"
            lang="en"
            disabled={disabled}
            aria-label={`Remover "${palavra}"`}
            onClick={() => onChange(frase.filter((_, j) => j !== i))}
            className="min-h-[44px] animate-pop-in rounded-xl bg-grape px-3.5 py-2 text-[1.05rem] font-semibold text-white shadow-[0_3px_0_0_var(--color-grape-strong)] transition-all hover:bg-grape-strong active:translate-y-[2px] active:shadow-none disabled:cursor-default disabled:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30"
          >
            {palavra}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Banco de palavras" className="flex flex-wrap justify-center gap-2.5">
        {banco.map((palavra, i) => {
          const usada = usadas.has(i);
          return (
            <button
              key={`${palavra}-${i}`}
              type="button"
              lang="en"
              disabled={disabled || usada}
              onClick={() => onChange([...frase, palavra])}
              aria-hidden={usada || undefined}
              tabIndex={usada ? -1 : undefined}
              className={`min-h-[44px] rounded-xl border-2 px-3.5 py-2 text-[1.05rem] font-semibold transition-all disabled:cursor-default focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30 ${
                usada
                  ? "border-gray-200 bg-gray-100 text-transparent shadow-none"
                  : "border-line-strong bg-gray-50 text-ink shadow-[0_3px_0_0_var(--color-line-strong)] hover:border-grape/60 active:translate-y-[2px] active:shadow-none"
              }`}
            >
              {palavra}
            </button>
          );
        })}
      </div>
      {frase.length > 0 && !disabled && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="min-h-[44px] rounded-xl px-2 text-sm font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
        >
          Limpar frase
        </button>
      )}
    </div>
  );
}
