"use client";

import { BotaoOuvir } from "./BotaoOuvir";
import type { PropsRenderizador } from "./tipos";

/** Múltipla escolha: botões de opção; mostra o texto de apoio (leitura) acima, se houver. */
export function ExercicioMcq({ id, conteudo, value, onChange, disabled, feedback }: PropsRenderizador<"mcq">) {
  const escolhida = typeof value === "number" ? value : -1;
  return (
    <div className="space-y-3">
      {conteudo.texto && (
        <div
          className="whitespace-pre-line rounded-2xl border border-sky/20 bg-sky-soft/60 p-4 text-[1.05rem] leading-relaxed text-ink"
          lang="en"
        >
          {conteudo.texto}
          <div className="mt-3">
            <BotaoOuvir texto={conteudo.texto} comLento />
          </div>
        </div>
      )}
      <div role="radiogroup" aria-labelledby={`enunciado-${id}`} className="grid gap-3">
        {conteudo.opcoes.map((opcao, i) => {
          const marcada = escolhida === i;
          let estilo = marcada
            ? "border-grape bg-grape-mist text-ink shadow-[0_3px_0_0_var(--color-grape)]"
            : "border-line-strong bg-white text-ink shadow-[0_3px_0_0_var(--color-line-strong)] hover:border-grape/50 hover:bg-grape-mist/50";
          if (feedback) {
            const ehCerta = opcao === feedback.respostaEsperada;
            if (ehCerta) estilo = "border-success-bright bg-success-soft text-success-ink shadow-[0_3px_0_0_var(--color-success-bright)]";
            else if (marcada) estilo = "border-danger-bright bg-danger-soft text-danger-ink shadow-[0_3px_0_0_var(--color-danger-bright)]";
            else estilo = "border-line bg-white text-ink-faint";
          }
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={marcada}
              disabled={disabled}
              onClick={() => onChange(i)}
              className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left text-[1.05rem] font-semibold transition-all active:translate-y-[2px] disabled:cursor-default disabled:active:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30 ${estilo}`}
              lang="en"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 font-display text-sm ${marcada && !feedback ? "border-grape bg-grape text-white" : "border-current/20 text-ink-faint"}`} aria-hidden>
                {String.fromCharCode(65 + i)}
              </span>
              {opcao}
            </button>
          );
        })}
      </div>
    </div>
  );
}
