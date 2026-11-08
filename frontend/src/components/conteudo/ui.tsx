"use client";

// Peças visuais compartilhadas pelas páginas de conteúdo da professora.

import { rotuloStatus, type StatusConteudo } from "@/lib/curso";

export const classeInput =
  "w-full min-h-[44px] px-3 py-2 rounded-xl border border-line-strong bg-card text-sm text-ink shadow-[inset_0_1px_1px_rgb(34_27_58/0.04)] transition-colors placeholder:text-ink-faint hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent";

/** Fundo violeta da ação principal (o mesmo gradiente da home). */
export const classeFundoAcao =
  "bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95";

export const classeBotaoPrimario = `inline-flex min-h-[40px] items-center justify-center gap-2 font-semibold rounded-xl px-4 py-2 text-sm tracking-[-0.005em] transition-[filter,transform] active:translate-y-px disabled:opacity-50 disabled:pointer-events-none ${classeFundoAcao}`;

export const classeBotaoSecundario =
  "inline-flex min-h-[40px] items-center justify-center gap-2 font-semibold rounded-xl bg-card border border-line-strong text-ink px-4 py-2 text-sm tracking-[-0.005em] shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const classeBotaoLink =
  "inline-flex min-h-[36px] items-center rounded-lg px-2 -mx-2 text-xs font-semibold text-accent hover:bg-accent-soft hover:text-accent-strong disabled:opacity-40 disabled:pointer-events-none";

const coresStatus: Record<StatusConteudo, string> = {
  rascunho: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  revisao: "bg-sun-soft text-sun-ink ring-1 ring-sun/40",
  publicado: "bg-success-soft text-success-ink ring-1 ring-success-bright/40",
};

export function StatusBadge({ status }: { status: StatusConteudo }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${coresStatus[status] ?? coresStatus.rascunho}`}
    >
      {rotuloStatus[status] ?? status}
    </span>
  );
}

export function Campo({
  rotulo,
  dica,
  htmlFor,
  children,
}: {
  rotulo: string;
  dica?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink mb-1">
        {rotulo}
      </label>
      {children}
      {dica && <p className="text-xs text-ink-soft mt-1">{dica}</p>}
    </div>
  );
}

/** Caixa verde que destaca o gabarito no editor. */
export function CaixaGabarito({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-success-bright/40 bg-success-soft/70 p-3 space-y-2">
      <p className="eyebrow text-success-ink">
        {titulo ?? "Gabarito"}
      </p>
      {children}
    </div>
  );
}

export function ConfirmDialog({
  titulo,
  children,
  rotuloConfirmar,
  perigo,
  ocupado,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  children: React.ReactNode;
  rotuloConfirmar: string;
  perigo?: boolean;
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-conteudo-titulo"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-[var(--radius-card)] border border-line bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-line">
          <h2 id="confirm-conteudo-titulo" className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {titulo}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="text-sm text-ink-soft space-y-2">{children}</div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onCancelar} className={classeBotaoSecundario}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={onConfirmar}
              className={
                perigo
                  ? "inline-flex min-h-[40px] items-center justify-center font-semibold rounded-xl bg-danger text-white px-4 py-2 text-sm hover:bg-danger-strong disabled:opacity-60"
                  : classeBotaoPrimario
              }
            >
              {ocupado ? "Aguarde…" : rotuloConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
