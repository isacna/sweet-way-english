"use client";

// Visualização somente-leitura de um item com gabarito (usada no teste do módulo).

import type { TipoExercicio } from "@/lib/curso";
import { MARCADOR_LACUNA, rotuloTipo } from "./formulario";

export type ItemComGabarito = {
  tipo: TipoExercicio | string;
  enunciado: string;
  conteudo: unknown;
  gabarito: unknown;
  explicacao?: string;
};

type Qualquer = Record<string, unknown>;
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

function Aceitas({ valores, rotulo = "Respostas aceitas" }: { valores: string[]; rotulo?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-emerald-800 mb-1">{rotulo}</p>
      <ul className="space-y-1">
        {valores.map((v, i) => (
          <li
            key={i}
            className="text-sm px-2 py-1 rounded bg-emerald-50 text-emerald-900 border border-emerald-100"
          >
            {v}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GabaritoView({ item }: { item: ItemComGabarito }) {
  const c = (item.conteudo ?? {}) as Qualquer;
  const g = (item.gabarito ?? {}) as Qualquer;

  let corpo: React.ReactNode = null;
  switch (item.tipo) {
    case "mcq": {
      const opcoes = lista(c.opcoes);
      corpo = (
        <div className="space-y-2">
          {typeof c.texto === "string" && (
            <p className="text-sm text-ink bg-gray-50 rounded-lg p-3 whitespace-pre-line">{c.texto}</p>
          )}
          <ol className="space-y-1">
            {opcoes.map((o, i) => {
              const certa = g.correta === i;
              return (
                <li
                  key={i}
                  className={`text-sm px-2 py-1 rounded border ${
                    certa
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-medium"
                      : "border-gray-100 text-ink-soft"
                  }`}
                >
                  {String.fromCharCode(65 + i)}) {o}
                  {certa && <span className="ml-2 text-xs">(correta)</span>}
                </li>
              );
            })}
          </ol>
        </div>
      );
      break;
    }
    case "cloze": {
      const partes = String(c.texto ?? "").split(MARCADOR_LACUNA);
      const respostas = Array.isArray(g.respostas) ? (g.respostas as unknown[]).map(lista) : [];
      const opcoes = Array.isArray(c.opcoesPorLacuna) ? (c.opcoesPorLacuna as unknown[]).map(lista) : null;
      corpo = (
        <div className="space-y-2">
          <p className="text-sm text-ink leading-7">
            {partes.map((p, i) => (
              <span key={i}>
                {p}
                {i < partes.length - 1 && (
                  <span className="inline-block mx-0.5 px-1.5 rounded bg-emerald-100 text-emerald-900 font-medium">
                    {(respostas[i] ?? []).join(" / ") || "?"}
                  </span>
                )}
              </span>
            ))}
          </p>
          {opcoes && (
            <p className="text-xs text-ink-soft">
              Opções:{" "}
              {opcoes.map((o, i) => `(${i + 1}) ${o.join(", ")}`).join(" · ")}
            </p>
          )}
        </div>
      );
      break;
    }
    case "word_order":
      corpo = (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {lista(c.palavras).map((p, i) => (
              <span key={i} className="text-sm px-2 py-0.5 rounded-md bg-gray-100 text-ink">
                {p}
              </span>
            ))}
          </div>
          <Aceitas valores={lista(g.aceitas)} rotulo="Frases aceitas" />
        </div>
      );
      break;
    case "match": {
      const esq = lista(c.esquerda);
      const dir = lista(c.direita);
      const pares = Array.isArray(g.pares) ? (g.pares as number[]) : [];
      corpo = (
        <ul className="space-y-1">
          {esq.map((e, i) => (
            <li key={i} className="text-sm flex flex-wrap gap-2 items-center">
              <span className="px-2 py-0.5 rounded bg-gray-100">{e}</span>
              <span aria-hidden>→</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-900">
                {dir[pares[i]] ?? "?"}
              </span>
            </li>
          ))}
        </ul>
      );
      break;
    }
    case "translate":
      corpo = (
        <div className="space-y-2">
          <p className="text-sm">
            <span className="text-xs text-ink-soft mr-2">
              {c.direcao === "en-pt" ? "Inglês → Português" : "Português → Inglês"}
            </span>
            <span className="font-medium text-ink">{String(c.frase ?? "")}</span>
          </p>
          <Aceitas valores={lista(g.aceitas)} />
        </div>
      );
      break;
    case "error_correction":
      corpo = (
        <div className="space-y-2">
          <p className="text-sm">
            <span className="text-xs text-ink-soft mr-2">Frase com erro:</span>
            <span className="font-medium text-red-700 line-through decoration-red-300">
              {String(c.frase ?? "")}
            </span>
          </p>
          <Aceitas valores={lista(g.aceitas)} rotulo="Correções aceitas" />
        </div>
      );
      break;
    default:
      corpo = (
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
          {JSON.stringify({ conteudo: c, gabarito: g }, null, 2)}
        </pre>
      );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-soft">
        {rotuloTipo[item.tipo as TipoExercicio] ?? item.tipo}
      </p>
      <p className="text-sm font-medium text-ink">{item.enunciado}</p>
      {corpo}
      {item.explicacao && (
        <p className="text-xs text-ink-soft bg-blue-50/60 border border-blue-100 rounded-lg p-2">
          <span className="font-semibold">Explicação: </span>
          {item.explicacao}
        </p>
      )}
    </div>
  );
}
