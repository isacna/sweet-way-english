"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";

/** Copia o código para a área de transferência; cai no `execCommand` em navegadores sem a Clipboard API. */
async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // segue para o plano B
  }
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Código de convite em destaque, com botão de copiar e instrução para os alunos. */
export function CodigoConvite({ codigo, compacto }: { codigo: string; compacto?: boolean }) {
  const [estado, setEstado] = useState<"" | "ok" | "erro">("");

  useEffect(() => {
    if (!estado) return;
    const t = setTimeout(() => setEstado(""), 2500);
    return () => clearTimeout(t);
  }, [estado]);

  async function aoCopiar() {
    setEstado((await copiar(codigo)) ? "ok" : "erro");
  }

  if (compacto) {
    return (
      <button
        type="button"
        onClick={() => void aoCopiar()}
        className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-line bg-gray-50 px-3 font-mono text-sm font-semibold text-ink hover:border-line-strong"
        aria-label={`Copiar o código de convite ${codigo}`}
      >
        <span className="truncate">{codigo}</span>
        {estado === "ok" ? (
          <Check aria-hidden className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <Copy aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />
        )}
        <span className="sr-only" aria-live="polite">
          {estado === "ok" ? "Código copiado" : estado === "erro" ? "Não foi possível copiar" : ""}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-accent shadow-sm" aria-hidden>
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-soft">Código de convite</p>
          <p className="break-all font-mono text-xl font-semibold tracking-wide text-ink">{codigo}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            O aluno entra em <strong className="font-semibold text-ink">Turmas</strong> e digita este código.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void aoCopiar()}
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-line-strong bg-card px-4 text-sm font-semibold text-ink shadow-sm hover:bg-gray-50"
      >
        {estado === "ok" ? <Check aria-hidden className="h-4 w-4 text-success" /> : <Copy aria-hidden className="h-4 w-4" />}
        {estado === "ok" ? "Copiado!" : "Copiar código"}
      </button>
      <span className="sr-only" aria-live="polite">
        {estado === "ok" ? "Código copiado" : estado === "erro" ? "Não foi possível copiar. Selecione o código e copie manualmente." : ""}
      </span>
    </div>
  );
}
