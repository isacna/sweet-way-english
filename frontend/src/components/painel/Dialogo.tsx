"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { classeBotao } from "./ui";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal acessível: role="dialog" + aria-modal, foco preso dentro (Tab/Shift+Tab),
 * Esc fecha, o foco volta para quem abriu e a página atrás não rola.
 * No celular abre como "folha" presa ao rodapé; a partir de `sm`, centralizado.
 */
export function Dialogo({
  titulo,
  descricao,
  onFechar,
  children,
  largura = "max-w-lg",
  bloquearFechar,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
  /** Enquanto uma requisição roda, Esc e o fundo não fecham. */
  bloquearFechar?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const descricaoId = useId();
  const fecharRef = useRef(onFechar);
  const bloquearRef = useRef(bloquearFechar);

  useEffect(() => {
    fecharRef.current = onFechar;
    bloquearRef.current = bloquearFechar;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const caixa = ref.current;
    // Primeiro campo com autoFocus, senão o primeiro elemento focável, senão a própria caixa
    const alvo =
      caixa?.querySelector<HTMLElement>("[data-autofocus]") ??
      caixa?.querySelector<HTMLElement>("input, select, textarea") ??
      caixa?.querySelector<HTMLElement>(FOCAVEIS) ??
      caixa;
    alvo?.focus();

    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function teclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!bloquearRef.current) {
          e.stopPropagation();
          fecharRef.current();
        }
        return;
      }
      if (e.key !== "Tab" || !caixa) return;
      const itens = Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (itens.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && (document.activeElement === primeiro || !caixa.contains(document.activeElement))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("keydown", teclado);
      document.body.style.overflow = overflowAntes;
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !bloquearFechar) onFechar();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricao ? descricaoId : undefined}
        tabIndex={-1}
        className={`pb-safe flex max-h-[92dvh] w-full ${largura} animate-rise flex-col rounded-t-[1.5rem] border border-line bg-card shadow-lg focus:outline-none sm:rounded-[var(--radius-card)] sm:pb-0`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
          <div className="min-w-0 pt-2">
            <h2 id={tituloId} className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {titulo}
            </h2>
            {descricao && (
              <p id={descricaoId} className="mt-0.5 text-sm text-ink-soft">
                {descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={bloquearFechar}
            aria-label="Fechar"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-gray-100 hover:text-ink disabled:opacity-50"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

/** Rodapé padrão dos formulários em diálogo: Cancelar + ação principal, empilhados no celular. */
export function AcoesDialogo({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
      {children}
    </div>
  );
}

/** Confirmação de ação destrutiva (ou importante). Mostra o erro da API dentro do próprio diálogo. */
export function ConfirmarDialogo({
  titulo,
  children,
  rotuloConfirmar,
  perigo = true,
  ocupado,
  erro,
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  perigo?: boolean;
  ocupado?: boolean;
  erro?: string;
  onConfirmar: () => void;
  onFechar: () => void;
}) {
  return (
    <Dialogo titulo={titulo} onFechar={onFechar} largura="max-w-md" bloquearFechar={ocupado}>
      <div className="space-y-3 text-sm text-ink-soft">{children}</div>
      <div aria-live="assertive">
        {erro && (
          <p role="alert" className="mt-4 rounded-xl border border-danger-bright/40 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger-ink">
            {erro}
          </p>
        )}
      </div>
      <AcoesDialogo>
        {/* Em ação destrutiva o foco começa no Cancelar */}
        <button
          type="button"
          onClick={onFechar}
          disabled={ocupado}
          data-autofocus={perigo ? true : undefined}
          className={classeBotao("secundario")}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          aria-busy={ocupado}
          data-autofocus={perigo ? undefined : true}
          className={classeBotao(perigo ? "perigo" : "primario")}
        >
          {ocupado ? "Aguarde…" : rotuloConfirmar}
        </button>
      </AcoesDialogo>
    </Dialogo>
  );
}
