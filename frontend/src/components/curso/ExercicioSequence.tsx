"use client";

import { useMemo } from "react";
import { embaralhar } from "@/lib/embaralhar";
import type { PropsRenderizador } from "./tipos";

export function ExercicioSequence({ id, conteudo, value, onChange, disabled }: PropsRenderizador<"sequence">) {
  const banco = useMemo(() => embaralhar(conteudo.trechos.map((_, i) => i), id), [conteudo.trechos, id]);
  const ordem = Array.isArray(value) ? value as number[] : [];
  return <div className="space-y-4">
    <div role="group" aria-label="Sequência montada" className="min-h-20 space-y-2 rounded-xl border-2 border-dashed border-grape/40 p-3">
      {!ordem.length && <p className="text-sm text-ink-soft">Escolha o primeiro acontecimento ou fala e continue na ordem.</p>}
      {ordem.map((indice, posicao) => <button type="button" key={indice} disabled={disabled} aria-label={`Remover trecho ${posicao + 1}: ${conteudo.trechos[indice]}`} className="block min-h-11 w-full touch-manipulation rounded-xl bg-grape px-4 py-3 text-left text-white disabled:opacity-70" onClick={() => onChange(ordem.filter((_, i) => i !== posicao))}><span className="mr-2 font-semibold">{posicao + 1}.</span><span lang="en">{conteudo.trechos[indice]}</span></button>)}
    </div>
    <div role="group" aria-label="Trechos disponíveis" className="space-y-2">
      {banco.filter((i) => !ordem.includes(i)).map((indice) => <button type="button" key={indice} disabled={disabled} lang="en" className="block min-h-11 w-full touch-manipulation rounded-xl border border-line bg-white px-4 py-3 text-left text-ink disabled:opacity-70" onClick={() => onChange([...ordem, indice])}>{conteudo.trechos[indice]}</button>)}
    </div>
    {!!ordem.length && !disabled && <button type="button" className="min-h-11 text-sm text-grape underline" onClick={() => onChange([])}>Recomeçar sequência</button>}
  </div>;
}
