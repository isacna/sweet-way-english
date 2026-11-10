"use client";

// Testa o gabarito de um exercício no editor: envia o item (como está no formulário, sem salvar)
// e uma resposta digitada para POST /conteudo/exercicios/verificar.

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Resposta, Resultado } from "@/lib/curso";
import { MARCADOR_LACUNA, type ExercicioPayload } from "./formulario";
import { classeBotaoSecundario, classeInput } from "./ui";

type Qualquer = Record<string, unknown>;
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function TestarExercicio({ item }: { item: ExercicioPayload }) {
  const c = item.conteudo as Qualquer;
  const [indice, setIndice] = useState<number | null>(null);
  const [textos, setTextos] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [indices, setIndices] = useState<(number | null)[]>([]);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");

  function montarResposta(): Resposta | null {
    switch (item.tipo) {
      case "sequence":
        return texto.trim() ? texto.trim().split(/\s+/).map((n) => Number(n) - 1) : [];
      case "mcq":
        return indice;
      case "cloze": {
        const n = String(c.texto ?? "").split(MARCADOR_LACUNA).length - 1;
        return Array.from({ length: n }, (_, i) => textos[i] ?? "");
      }
      case "word_order":
        return texto.trim().split(/\s+/).filter(Boolean);
      case "match":
        return lista(c.esquerda).map((_, i) => indices[i] ?? -1);
      default:
        return texto;
    }
  }

  async function testar() {
    setErro("");
    setResultado(null);
    const resposta = montarResposta();
    if (resposta === null) {
      setErro("Escolha uma opção para testar.");
      return;
    }
    setTestando(true);
    const res = await apiFetch("/conteudo/exercicios/verificar", {
      method: "POST",
      body: JSON.stringify({ item, resposta }),
    }).catch(() => null);
    setTestando(false);
    if (!res) {
      setErro("Sem conexão com o servidor.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(data.error ?? "Não foi possível testar o exercício.");
      return;
    }
    setResultado(data as Resultado);
  }

  let entrada: React.ReactNode;
  switch (item.tipo) {
    case "sequence":
      entrada = <div className="space-y-2"><ol>{lista(c.trechos).map((t, i) => <li key={i}>{i + 1}. {t}</li>)}</ol><input aria-label="Ordem dos trechos" className={classeInput} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Números na ordem, ex.: 3 1 2" /></div>;
      break;
    case "mcq":
      entrada = (
        <div className="flex flex-wrap gap-3">
          {lista(c.opcoes).map((o, i) => (
            <label key={i} className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name={`testar-${item.id ?? "novo"}-${item.enunciado}`}
                checked={indice === i}
                onChange={() => setIndice(i)}
              />
              {o}
            </label>
          ))}
        </div>
      );
      break;
    case "cloze": {
      const partes = String(c.texto ?? "").split(MARCADOR_LACUNA);
      const opcoes = Array.isArray(c.opcoesPorLacuna) ? (c.opcoesPorLacuna as unknown[]).map(lista) : null;
      entrada = (
        <p className="text-sm leading-9">
          {partes.map((p, i) => (
            <span key={i}>
              {p}
              {i < partes.length - 1 &&
                (opcoes ? (
                  <select
                    aria-label={`Lacuna ${i + 1}`}
                    value={textos[i] ?? ""}
                    onChange={(e) => setTextos((t) => Object.assign([...t], { [i]: e.target.value }))}
                    className="mx-1 px-2 py-1 rounded-lg border border-line-strong text-sm bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                  >
                    <option value="">—</option>
                    {(opcoes[i] ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label={`Lacuna ${i + 1}`}
                    value={textos[i] ?? ""}
                    onChange={(e) => setTextos((t) => Object.assign([...t], { [i]: e.target.value }))}
                    className="mx-1 w-28 px-2 py-1 rounded-lg border border-line-strong text-sm bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                  />
                ))}
            </span>
          ))}
        </p>
      );
      break;
    }
    case "match": {
      const direita = lista(c.direita);
      entrada = (
        <div className="space-y-1.5">
          {lista(c.esquerda).map((e, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-24">{e}</span>
              <span aria-hidden>→</span>
              <select
                aria-label={`Par de ${e}`}
                value={indices[i] ?? ""}
                onChange={(ev) =>
                  setIndices((v) =>
                    Object.assign([...v], { [i]: ev.target.value === "" ? null : Number(ev.target.value) })
                  )
                }
                className="px-2 py-1 rounded-lg border border-line-strong text-sm bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              >
                <option value="">—</option>
                {direita.map((d, j) => (
                  <option key={j} value={j}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
      break;
    }
    default:
      entrada = (
        <input
          aria-label="Resposta de teste"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={item.tipo === "word_order" ? "Digite a frase na ordem, separando por espaços" : "Digite uma resposta"}
          className={classeInput}
        />
      );
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3 space-y-3 bg-gray-50/60">
      <p className="text-xs font-semibold text-ink-soft">
        Testar o gabarito (usa o que está no formulário, mesmo sem salvar)
      </p>
      {entrada}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void testar()} disabled={testando} className={classeBotaoSecundario}>
          {testando ? "Testando…" : "Testar"}
        </button>
        {resultado && (
          <span
            className={`text-sm font-medium ${resultado.correto ? "text-success-ink" : "text-danger-ink"}`}
          >
            {resultado.correto ? "Correto" : "Incorreto"} · pontuação {Math.round(resultado.pontuacao * 100)}%
          </span>
        )}
      </div>
      {resultado && !resultado.correto && (
        <p className="text-xs text-ink-soft">
          Resposta esperada: <strong className="text-ink">{resultado.respostaEsperada}</strong>
        </p>
      )}
      {erro && <p className="text-sm text-danger-ink bg-danger-soft px-3 py-2 rounded-lg">{erro}</p>}
    </div>
  );
}
