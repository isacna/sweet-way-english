"use client";

import type { PropsRenderizador } from "./tipos";

/** Lacunas: cada `___` do texto vira um campo (ou uma lista, quando há `opcoesPorLacuna`). */
export function ExercicioCloze({ id, conteudo, value, onChange, disabled, onSubmit }: PropsRenderizador<"cloze">) {
  const partes = conteudo.texto.split("___");
  const lacunas = partes.length - 1;
  const valores: string[] = Array.isArray(value) ? (value as string[]) : [];

  function alterar(i: number, texto: string) {
    const novo = Array.from({ length: lacunas }, (_, j) => valores[j] ?? "");
    novo[i] = texto;
    onChange(novo);
  }

  return (
    <p className="break-words rounded-2xl bg-grape-mist/60 p-4 text-[1.15rem] leading-[3rem] text-ink" lang="en">
      {partes.map((parte, i) => (
        <span key={i}>
          <span className="whitespace-pre-line">{parte}</span>
          {i < lacunas &&
            (conteudo.opcoesPorLacuna?.[i] ? (
              <select
                aria-label={`Lacuna ${i + 1}`}
                value={valores[i] ?? ""}
                disabled={disabled}
                onChange={(e) => alterar(i, e.target.value)}
                className="mx-1 min-h-[44px] rounded-xl border-2 border-grape/40 bg-white px-2.5 py-1.5 align-middle text-base font-semibold text-grape-strong shadow-[0_2px_0_0_var(--color-grape-soft)] focus:outline-none focus:ring-4 focus:ring-grape/25 disabled:bg-gray-50 disabled:text-ink"
              >
                <option value="">…</option>
                {conteudo.opcoesPorLacuna[i].map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`lacuna-${id}-${i}`}
                aria-label={`Lacuna ${i + 1}`}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={valores[i] ?? ""}
                disabled={disabled}
                onChange={(e) => alterar(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && onSubmit) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                size={Math.max(6, (valores[i] ?? "").length + 1)}
                className="mx-1 min-h-[44px] max-w-[12rem] rounded-xl border-2 border-b-4 border-grape/40 border-b-grape bg-white px-2.5 py-1.5 text-center align-middle text-base font-semibold text-grape-strong focus:outline-none focus:ring-4 focus:ring-grape/25 disabled:bg-gray-50 disabled:text-ink"
              />
            ))}
        </span>
      ))}
    </p>
  );
}
