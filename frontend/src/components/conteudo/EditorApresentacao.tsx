"use client";

import type { ApresentacaoForm, LinhaPar } from "./formulario";
import { Campo, classeBotaoLink, classeInput } from "./ui";

function ListaTextos({
  itens,
  onChange,
  rotuloItem,
  rotuloAdicionar,
  multilinha,
  minimo = 0,
}: {
  itens: string[];
  onChange: (v: string[]) => void;
  rotuloItem: string;
  rotuloAdicionar: string;
  multilinha?: boolean;
  minimo?: number;
}) {
  return (
    <div className="space-y-2">
      {itens.map((t, i) => (
        <div key={i} className="flex gap-2 items-start">
          {multilinha ? (
            <textarea
              aria-label={`${rotuloItem} ${i + 1}`}
              value={t}
              rows={3}
              onChange={(e) => onChange(itens.map((x, j) => (j === i ? e.target.value : x)))}
              className={classeInput}
            />
          ) : (
            <input
              aria-label={`${rotuloItem} ${i + 1}`}
              value={t}
              onChange={(e) => onChange(itens.map((x, j) => (j === i ? e.target.value : x)))}
              className={classeInput}
            />
          )}
          <button
            type="button"
            disabled={itens.length <= minimo}
            onClick={() => onChange(itens.filter((_, j) => j !== i))}
            className="shrink-0 px-2 py-2 text-sm text-red-600 hover:text-red-700 disabled:opacity-30"
            aria-label={`Remover ${rotuloItem.toLowerCase()} ${i + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...itens, ""])} className={classeBotaoLink}>
        + {rotuloAdicionar}
      </button>
    </div>
  );
}

function TabelaPares({
  linhas,
  onChange,
  rotuloAdicionar,
}: {
  linhas: LinhaPar[];
  onChange: (v: LinhaPar[]) => void;
  rotuloAdicionar: string;
}) {
  const atualizar = (i: number, campo: keyof LinhaPar, valor: string) =>
    onChange(linhas.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  return (
    <div className="space-y-2">
      {linhas.length > 0 && (
        <div className="hidden sm:grid grid-cols-[1fr_1fr_2rem] gap-2 text-xs font-medium text-ink-soft">
          <span>Inglês</span>
          <span>Português</span>
          <span />
        </div>
      )}
      {linhas.map((l, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2rem] gap-2 items-start">
          <input
            aria-label={`Inglês, linha ${i + 1}`}
            placeholder="English"
            value={l.en}
            onChange={(e) => atualizar(i, "en", e.target.value)}
            className={classeInput}
          />
          <input
            aria-label={`Português, linha ${i + 1}`}
            placeholder="Português"
            value={l.pt}
            onChange={(e) => atualizar(i, "pt", e.target.value)}
            className={classeInput}
          />
          <button
            type="button"
            onClick={() => onChange(linhas.filter((_, j) => j !== i))}
            className="px-2 py-2 text-sm text-red-600 hover:text-red-700 justify-self-start"
            aria-label={`Remover linha ${i + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...linhas, { en: "", pt: "" }])}
        className={classeBotaoLink}
      >
        + {rotuloAdicionar}
      </button>
    </div>
  );
}

export function EditorApresentacao({
  valor,
  onChange,
}: {
  valor: ApresentacaoForm;
  onChange: (v: ApresentacaoForm) => void;
}) {
  const set = <K extends keyof ApresentacaoForm>(k: K, v: ApresentacaoForm[K]) =>
    onChange({ ...valor, [k]: v });

  return (
    <div className="space-y-5">
      <Campo
        rotulo="Explicação (parágrafos em português)"
        dica="Texto curto e direto, sem markdown. Pelo menos um parágrafo."
      >
        <ListaTextos
          itens={valor.explicacao}
          onChange={(v) => set("explicacao", v)}
          rotuloItem="Parágrafo"
          rotuloAdicionar="Adicionar parágrafo"
          multilinha
          minimo={1}
        />
      </Campo>

      <Campo rotulo="Regras (opcional)" dica='Tópicos curtos, ex.: "I am / you are / he is".'>
        <ListaTextos
          itens={valor.regras}
          onChange={(v) => set("regras", v)}
          rotuloItem="Regra"
          rotuloAdicionar="Adicionar regra"
        />
      </Campo>

      <Campo
        rotulo="Nota contrastiva (opcional)"
        htmlFor="nota-contrastiva"
        dica="Armadilha típica de quem fala português."
      >
        <textarea
          id="nota-contrastiva"
          rows={2}
          value={valor.notaContrastiva}
          onChange={(e) => set("notaContrastiva", e.target.value)}
          className={classeInput}
        />
      </Campo>

      <Campo rotulo="Exemplos" dica="Pelo menos 3 exemplos, com tradução.">
        <TabelaPares
          linhas={valor.exemplos}
          onChange={(v) => set("exemplos", v)}
          rotuloAdicionar="Adicionar exemplo"
        />
      </Campo>

      <Campo rotulo="Vocabulário (opcional)">
        <TabelaPares
          linhas={valor.vocabulario}
          onChange={(v) => set("vocabulario", v)}
          rotuloAdicionar="Adicionar palavra"
        />
      </Campo>
    </div>
  );
}
