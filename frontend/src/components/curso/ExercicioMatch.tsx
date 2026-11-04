"use client";

import type { PropsRenderizador } from "./tipos";

/** Associar: para cada item da esquerda, escolhe o par da direita. Envia `number[]` (índice em `direita`). */
export function ExercicioMatch({ id, conteudo, value, onChange, disabled }: PropsRenderizador<"match">) {
  const { esquerda, direita } = conteudo;
  const escolhas: number[] = Array.isArray(value) ? (value as number[]) : esquerda.map(() => -1);

  function alterar(i: number, j: number) {
    const novo = esquerda.map((_, k) => (typeof escolhas[k] === "number" ? escolhas[k] : -1));
    novo[i] = j;
    onChange(novo);
  }

  return (
    <ul className="space-y-2.5">
      {esquerda.map((item, i) => {
        const campo = `match-${id}-${i}`;
        const atual = escolhas[i] ?? -1;
        return (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-white p-3 sm:flex-row sm:items-center"
          >
            <label htmlFor={campo} className="break-words px-1 text-[1.05rem] font-semibold text-ink sm:w-1/2" lang="en">
              {item}
            </label>
            <select
              id={campo}
              value={atual}
              disabled={disabled}
              onChange={(e) => alterar(i, Number(e.target.value))}
              className={`min-h-[48px] w-full rounded-xl border-2 px-3 py-2 text-base font-medium focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/20 disabled:bg-gray-50 sm:w-1/2 ${atual >= 0 ? "border-grape/50 bg-grape-mist text-grape-strong" : "border-line-strong bg-white text-ink"}`}
            >
              <option value={-1}>Escolha…</option>
              {direita.map((d, j) => {
                const usadaEmOutro = escolhas.some((e, k) => k !== i && e === j);
                return (
                  <option key={j} value={j}>
                    {d}
                    {usadaEmOutro ? " (já usada)" : ""}
                  </option>
                );
              })}
            </select>
          </li>
        );
      })}
    </ul>
  );
}
