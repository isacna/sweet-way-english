"use client";

import { BotaoOuvir } from "./BotaoOuvir";
import type { PropsRenderizador } from "./tipos";

type Props =
  | ({ tipo: "translate" } & PropsRenderizador<"translate">)
  | ({ tipo: "error_correction" } & PropsRenderizador<"error_correction">);

/** Tradução e correção de erro: mostra a frase de origem e um campo de texto. */
export function ExercicioTexto(props: Props) {
  const { id, value, onChange, disabled, onSubmit } = props;
  const texto = typeof value === "string" ? value : "";
  const direcao = props.tipo === "translate" ? props.conteudo.direcao : null;

  const rotulo =
    direcao === "pt-en"
      ? "Traduza para o inglês"
      : direcao === "en-pt"
        ? "Traduza para o português"
        : "Encontre e corrija o erro";
  const idiomaOrigem = direcao === "pt-en" ? "pt-BR" : "en";
  const idiomaResposta = direcao === "en-pt" ? "pt-BR" : "en";

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-grape/25 bg-grape-mist p-4">
        <p className="eyebrow mb-1.5 text-grape">{rotulo}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-2 break-words text-xl font-semibold text-ink" lang={idiomaOrigem}>
          {props.conteudo.frase}
          {/* Só a frase em inglês correta; a frase com erro não deve ser "ensinada" pelo áudio */}
          {direcao === "en-pt" && <BotaoOuvir texto={props.conteudo.frase} />}
        </p>
      </div>
      <label htmlFor={`texto-${id}`} className="sr-only">
        Sua resposta
      </label>
      <input
        id={`texto-${id}`}
        type="text"
        lang={idiomaResposta}
        autoComplete="off"
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        value={texto}
        disabled={disabled}
        placeholder={direcao ? "Escreva a tradução" : "Escreva a frase corrigida"}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-gray-50 px-4 py-3 text-[1.05rem] text-ink placeholder:text-ink-faint focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/20 disabled:bg-gray-50"
      />
    </div>
  );
}
