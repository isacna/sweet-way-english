"use client";

import { useState } from "react";
import type { Missao } from "@/lib/curso";

/** Produção pessoal não recebe uma nota automática por comparação de texto. */
export function MissaoLicao({ missao, onAnotar, espacoNotas = 5000 }: { missao: Missao; onAnotar: (texto: string) => void; espacoNotas?: number }) {
  const [texto, setTexto] = useState("");
  const [salvo, setSalvo] = useState(false);
  const cabeNasNotas = `${missao.titulo}\n${texto.trim()}`.length <= espacoNotas;
  return (
    <section className="card space-y-4 p-5" aria-label="Missão prática">
      <h2 className="text-lg font-semibold text-ink">Sua missão: {missao.titulo}</h2>
      <p className="leading-7 text-ink">{missao.enunciado}</p>
      <label className="block space-y-2">
        <span className="text-sm font-semibold">Sua resposta em inglês</span>
        <textarea lang="en" rows={5} maxLength={5000} value={texto} onChange={(e) => { setTexto(e.target.value); setSalvo(false); }} className="w-full rounded-xl border border-line p-3 text-base" />
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Revise sua produção</legend>
        {missao.criterios.map((criterio, i) => <label key={i} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" />{criterio}</label>)}
      </fieldset>
      <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-grape">Ver um exemplo possível</summary><p lang="en" className="whitespace-pre-line leading-7">{missao.exemplo}</p></details>
      <button type="button" disabled={!texto.trim() || salvo || !cabeNasNotas} className="min-h-11 touch-manipulation rounded-xl bg-grape px-4 py-3 font-semibold text-white disabled:opacity-50" onClick={() => { onAnotar(`${missao.titulo}\n${texto.trim()}`); setSalvo(true); }}>Guardar nas minhas notas</button>
      {!cabeNasNotas && !salvo && <p className="text-sm text-danger-ink">Não há espaço suficiente nas notas. Reduza a resposta ou libere espaço no caderno antes de guardar.</p>}
      <p role="status" className="text-sm text-ink-soft">{salvo ? "Resposta adicionada às suas notas." : "Prática com autoavaliação, sem nota automática. Guarde sua resposta nas notas antes de sair."}</p>
    </section>
  );
}
