"use client";

import { Turtle, Volume2 } from "lucide-react";
import { useSyncExternalStore } from "react";

// Pronúncia com a voz do próprio navegador (Web Speech API, speechSynthesis): grátis,
// sem servidor e sem IA. A qualidade da voz depende do sistema; Chrome e Edge têm vozes en-US boas.

const assinarNada = () => () => {};
const temSuporte = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Prefere vozes en-US naturais; cai para qualquer en-US e, por fim, qualquer inglês. */
function escolherVoz(): SpeechSynthesisVoice | undefined {
  const vozes = window.speechSynthesis.getVoices();
  const enUS = vozes.filter((v) => v.lang.replace("_", "-").toLowerCase() === "en-us");
  return (
    enUS.find((v) => /natural|online|google|aria|jenny|samantha/i.test(v.name)) ??
    enUS[0] ??
    vozes.find((v) => v.lang.toLowerCase().startsWith("en"))
  );
}

export function falar(texto: string, velocidade = 0.9) {
  if (!temSuporte()) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // interrompe a frase anterior
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "en-US";
  fala.rate = velocidade;
  const voz = escolherVoz();
  if (voz) fala.voice = voz;
  synth.speak(fala);
}

type Props = {
  texto: string;
  /** Mostra também o botão de velocidade lenta. */
  comLento?: boolean;
  /** Versão maior (ex.: destaque de exemplos). */
  grande?: boolean;
  className?: string;
};

/** Botão de áudio (azul-céu) que lê o texto em inglês americano. Não renderiza nada se o navegador não suporta. */
export function BotaoOuvir({ texto, comLento, grande, className = "" }: Props) {
  const suportado = useSyncExternalStore(assinarNada, temSuporte, () => false);
  if (!suportado) return null;

  const tam = grande ? "h-12 w-12" : "h-11 w-11";
  const comum =
    "inline-flex shrink-0 items-center justify-center rounded-full transition-all active:translate-y-[2px] active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-sky/30";
  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${className}`}>
      <button
        type="button"
        onClick={() => falar(texto)}
        className={`${comum} ${tam} bg-sky text-white shadow-[0_3px_0_0_var(--color-sky-strong)] hover:bg-sky-strong`}
        aria-label={`Ouvir: ${texto}`}
        title="Ouvir"
      >
        <Volume2 aria-hidden className={grande ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2.4} />
      </button>
      {comLento && (
        <button
          type="button"
          onClick={() => falar(texto, 0.6)}
          className={`${comum} h-9 w-9 border-2 border-sky/25 bg-sky-soft text-sky-ink hover:border-sky/50`}
          aria-label={`Ouvir devagar: ${texto}`}
          title="Ouvir devagar"
        >
          <Turtle aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </button>
      )}
    </span>
  );
}
