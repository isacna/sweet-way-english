"use client";

import { Turtle, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { falar } from "./BotaoOuvir";
import { classeBotao } from "./ui";
import type { PropsRenderizador } from "./tipos";

// Ditado: o aluno ouve a frase na voz do navegador (speechSynthesis, en-US) e escreve o que ouviu.
// A frase chega no `conteudo` (é o navegador que fala), mas nunca é mostrada aqui: nem em texto,
// nem em rótulo acessível. Depois da resposta, quem mostra a frase é a caixa de correção.

// ─── Há voz em inglês? ──────────────────────────────────────────────────────
// A lista de vozes costuma chegar depois do carregamento (evento `voiceschanged`). Enquanto ela não
// chega, o exercício fica disponível; se continuar vazia depois de ESPERA_VOZES_MS, ou se chegar sem
// nenhuma voz em inglês, o aluno vê o aviso para pular. O resultado vale para a sessão inteira.

export type EstadoVoz = "verificando" | "ok" | "sem-voz";

const ESPERA_VOZES_MS = 2500;

let estadoVoz: EstadoVoz = "verificando";
let iniciada = false;
let espera: ReturnType<typeof setTimeout> | undefined;
const ouvintes = new Set<() => void>();

function definirVoz(novo: EstadoVoz) {
  if (novo === estadoVoz) return;
  estadoVoz = novo;
  ouvintes.forEach((avisar) => avisar());
}

function avaliarVozes() {
  if (estadoVoz === "ok") return; // não volta atrás (inclui o "tentar mesmo assim")
  const vozes = window.speechSynthesis.getVoices();
  if (vozes.some((v) => v.lang.replace("_", "-").toLowerCase().startsWith("en"))) definirVoz("ok");
  else if (vozes.length > 0) definirVoz("sem-voz");
}

function assinarVoz(avisar: () => void) {
  ouvintes.add(avisar);
  if (!iniciada) {
    iniciada = true;
    if (!("speechSynthesis" in window)) definirVoz("sem-voz");
    else {
      avaliarVozes();
      // Safari antigo não tem addEventListener em speechSynthesis; lá a lista já vem pronta
      window.speechSynthesis.addEventListener?.("voiceschanged", avaliarVozes);
      espera = setTimeout(() => {
        if (estadoVoz === "verificando") definirVoz("sem-voz");
      }, ESPERA_VOZES_MS);
    }
  }
  return () => {
    ouvintes.delete(avisar);
  };
}

/** O aluno quer tentar mesmo sem voz detectada (alguns navegadores falam sem listar as vozes). */
function forcarVoz() {
  definirVoz("ok");
}

/** Só para testes: esquece o que foi detectado. */
export function reiniciarDeteccaoVoz() {
  if (espera) clearTimeout(espera);
  if (typeof window !== "undefined" && "speechSynthesis" in window)
    window.speechSynthesis.removeEventListener?.("voiceschanged", avaliarVozes);
  espera = undefined;
  iniciada = false;
  estadoVoz = "verificando";
}

const lerVoz = () => estadoVoz;
const lerVozServidor = (): EstadoVoz => "verificando";

// ─── Renderizador ───────────────────────────────────────────────────────────

type Props = PropsRenderizador<"dictation"> & {
  /** Pula o exercício (sem voz em inglês). Sem ele, o aviso aponta para o botão "Pular" da tela. */
  onPular?: () => void;
};

export function ExercicioDictation({ id, conteudo, value, onChange, disabled, feedback, onSubmit, onPular }: Props) {
  const voz = useSyncExternalStore(assinarVoz, lerVoz, lerVozServidor);
  const texto = typeof value === "string" ? value : "";
  const botaoOuvir = useRef<HTMLButtonElement>(null);

  // Foco no "Ouvir" ao abrir (Enter ou espaço tocam o áudio). Nada toca sozinho.
  useEffect(() => {
    if (!disabled) botaoOuvir.current?.focus({ preventScroll: true });
    // só na montagem: o foco não deve voltar para o botão a cada correção
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sair do exercício interrompe a fala
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    []
  );

  if (voz === "sem-voz" && !feedback) {
    return (
      <div data-voz={voz} role="status" className="rounded-2xl border-2 border-sun/50 bg-sun-soft p-4 sm:p-5">
        <p className="flex items-start gap-2.5 font-semibold text-ink">
          <VolumeX className="mt-0.5 h-5 w-5 shrink-0 text-sun-ink" aria-hidden />
          Seu navegador não tem voz em inglês: pule este exercício.
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          O ditado usa a voz do próprio aparelho. Pular não atrapalha a lição
          {onPular ? "." : ": use o botão “Pular”, logo abaixo."} No Chrome e no Edge a voz em inglês costuma estar
          disponível.
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {onPular && (
            <button type="button" onClick={onPular} className={classeBotao("secundario")}>
              Pular este exercício
            </button>
          )}
          <button type="button" onClick={forcarVoz} className={classeBotao("fantasma")}>
            Tentar ouvir mesmo assim
          </button>
        </div>
      </div>
    );
  }

  const classeAudio =
    "inline-flex touch-manipulation items-center justify-center gap-2.5 rounded-2xl font-semibold transition-all active:translate-y-[2px] active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-sky/30";

  return (
    <div data-voz={voz} className="space-y-3">
      <div className="rounded-2xl border border-sky/25 bg-sky-soft p-4 sm:p-5">
        <p className="eyebrow mb-3 text-sky-ink">Ditado · ouça e escreva</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            ref={botaoOuvir}
            type="button"
            onClick={() => falar(conteudo.frase)}
            className={`${classeAudio} min-h-[60px] bg-sky px-7 text-lg text-white shadow-[0_4px_0_0_var(--color-sky-strong)] hover:bg-sky-strong`}
          >
            <Volume2 className="h-6 w-6" strokeWidth={2.4} aria-hidden />
            Ouvir
          </button>
          <button
            type="button"
            onClick={() => falar(conteudo.frase, 0.6)}
            className={`${classeAudio} min-h-[48px] border-2 border-sky/30 bg-card px-4 text-sky-ink hover:border-sky/60`}
          >
            <Turtle className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            Ouvir devagar
          </button>
        </div>
        <p className="mt-3 text-sm text-ink-soft">Você pode ouvir quantas vezes quiser.</p>
        {conteudo.dica && (
          <p className="mt-1 break-words text-sm text-ink">
            <span className="font-semibold">Dica:</span> {conteudo.dica}
          </p>
        )}
      </div>
      <label htmlFor={`texto-${id}`} className="sr-only">
        Escreva o que você ouviu
      </label>
      <input
        id={`texto-${id}`}
        type="text"
        lang="en"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={texto}
        disabled={disabled}
        placeholder="Escreva o que você ouviu"
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
