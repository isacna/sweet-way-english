"use client";

import { Check, Lightbulb, X } from "lucide-react";
import type { Resultado } from "@/lib/curso";
import { BotaoOuvir } from "./BotaoOuvir";

type Props = {
  resultado: Resultado;
  /** Resposta do aluno já formatada, quando útil (revisão de quiz/teste). */
  suaResposta?: string;
  compacto?: boolean;
  /** Mostra o botão de áudio da resposta esperada (quando ela é uma frase em inglês). */
  ouvir?: boolean;
  children?: React.ReactNode;
};

/** Caixa de correção: certo/errado, resposta esperada e explicação. */
export function FeedbackResultado({ resultado, suaResposta, compacto, ouvir, children }: Props) {
  const parcial = !resultado.correto && resultado.pontuacao > 0;
  const tom = resultado.correto
    ? { caixa: "border-success-bright/50 bg-success-soft", icone: "bg-success", titulo: "text-success-ink" }
    : parcial
      ? { caixa: "border-sun/60 bg-sun-soft", icone: "bg-sun-ink", titulo: "text-sun-ink" }
      : { caixa: "border-danger-bright/50 bg-danger-soft", icone: "bg-danger", titulo: "text-danger-ink" };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border-2 ${compacto ? "p-3.5" : "p-4 sm:p-5"} ${tom.caixa} ${
        compacto ? "" : resultado.correto ? "animate-pop-in" : "animate-shake"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full text-white ${tom.icone} ${
            compacto ? "h-7 w-7" : "h-9 w-9"
          }`}
          aria-hidden
        >
          {resultado.correto ? (
            <Check className={compacto ? "h-4 w-4" : "h-5 w-5"} strokeWidth={3.2} />
          ) : (
            <X className={compacto ? "h-4 w-4" : "h-5 w-5"} strokeWidth={3.2} />
          )}
        </span>
        <p className={`font-display font-semibold ${compacto ? "text-base" : "text-xl"} ${tom.titulo}`}>
          {resultado.correto ? (
            <>
              <span className="sr-only">✓ </span>Correto!
            </>
          ) : parcial ? (
            `Quase! ${Math.round(resultado.pontuacao * 100)}% certo`
          ) : (
            <>
              <span className="sr-only">✗ </span>Não foi dessa vez
            </>
          )}
        </p>
      </div>

      <div className={compacto ? "mt-2 space-y-1.5" : "mt-3 space-y-2"}>
        {suaResposta !== undefined && (
          <p className="break-words text-sm text-ink-soft">
            Sua resposta: <span lang="en" className="font-medium text-ink">{suaResposta}</span>
          </p>
        )}
        {(!resultado.correto || suaResposta !== undefined) && (
          <p className="break-words text-sm text-ink">
            Resposta esperada:{" "}
            <strong lang="en" className="rounded-lg bg-white/80 px-1.5 py-0.5 font-semibold">
              {resultado.respostaEsperada}
            </strong>
          </p>
        )}
        {ouvir && (
          <p className="flex items-center gap-2.5 text-sm font-medium text-ink-soft">
            <BotaoOuvir texto={resultado.respostaEsperada} comLento />
            Ouça a pronúncia
          </p>
        )}
        {resultado.explicacao && (
          <p className="flex gap-2 rounded-xl bg-white/70 p-3 text-sm leading-relaxed text-ink">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sun-ink" aria-hidden />
            <span>{resultado.explicacao}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
