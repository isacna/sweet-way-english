"use client";

import Link from "next/link";

/** Barra de progresso (0–100). */
export function BarraProgresso({
  valor,
  rotulo,
  cor = "bg-gradient-to-r from-grape-bright to-grape",
  marca,
  grossa,
}: {
  valor: number;
  rotulo: string;
  cor?: string;
  /** Linha vertical opcional (ex.: limiar de aprovação). */
  marca?: number;
  /** Versão mais alta (topo do player). */
  grossa?: boolean;
}) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={`relative w-full overflow-hidden rounded-full bg-gray-100 ${grossa ? "h-3.5" : "h-2.5"}`}
    >
      <div
        className={`relative h-full rounded-full transition-[width] duration-500 ease-out ${cor}`}
        style={{ width: `${v}%` }}
      >
        {/* brilho no topo da barra */}
        {v > 4 && grossa && (
          <span className="absolute inset-x-2 top-[3px] h-[3px] rounded-full bg-white/35" aria-hidden />
        )}
      </div>
      {marca !== undefined && (
        <div className="absolute top-0 bottom-0 w-0.5 bg-ink/40" style={{ left: `${marca}%` }} aria-hidden />
      )}
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="card mx-auto flex max-w-3xl items-center gap-3 p-6">
      <span
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-grape-soft border-t-grape"
        aria-hidden
      />
      <p className="text-sm font-medium text-ink-soft" role="status">
        {texto}
      </p>
    </div>
  );
}

/** Mensagem de erro/estado com link de volta para a trilha. */
export function Aviso({
  titulo,
  texto,
  icone = "⚠️",
  acao,
}: {
  titulo: string;
  texto?: string;
  icone?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="card mx-auto max-w-xl animate-rise p-8 text-center">
      <div
        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-candy-soft via-grape-soft to-sky-soft text-4xl"
        aria-hidden
      >
        {icone}
      </div>
      <h1 className="text-2xl font-semibold text-ink">{titulo}</h1>
      {texto && <p className="mt-2 text-ink-soft">{texto}</p>}
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {acao ?? (
          <Link href="/aluno/curso" className={classeBotao("primario")}>
            Voltar para a trilha
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Classes dos botões do curso: grandes (≥ 48px), com a "base" 3D dos apps de idioma.
 * primario = violeta; sucesso/erro = barra de feedback; secundario = contorno; fantasma = texto.
 */
export function classeBotao(
  variante: "primario" | "secundario" | "fantasma" | "sucesso" | "erro" = "primario"
) {
  const base =
    "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 py-3 font-display text-[1.05rem] font-semibold tracking-wide transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30 disabled:cursor-not-allowed";
  const pressionar = "active:translate-y-[3px] active:shadow-none";
  if (variante === "primario")
    return `${base} ${pressionar} bg-grape text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_4px_0_0_var(--color-grape-strong)] hover:bg-grape-strong disabled:bg-gray-200 disabled:text-ink-faint disabled:shadow-[0_4px_0_0_var(--color-gray-300)] disabled:translate-y-0`;
  if (variante === "sucesso")
    return `${base} ${pressionar} bg-success text-white shadow-[0_4px_0_0_var(--color-success-strong)] hover:bg-success-strong`;
  if (variante === "erro")
    return `${base} ${pressionar} bg-danger text-white shadow-[0_4px_0_0_var(--color-danger-strong)] hover:bg-danger-strong`;
  if (variante === "secundario")
    return `${base} ${pressionar} border-2 border-line-strong bg-card text-ink shadow-[0_3px_0_0_var(--color-line-strong)] hover:bg-gray-50 disabled:opacity-50`;
  return `${base} text-ink-soft hover:bg-gray-100 hover:text-ink disabled:opacity-50`;
}

/** Barra de ação presa ao rodapé da tela (alcance do polegar no celular). */
export function BarraAcao({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "neutro" | "certo" | "errado" }) {
  const fundo =
    tom === "certo"
      ? "border-success-bright/40 bg-success-soft/95"
      : tom === "errado"
        ? "border-danger-bright/40 bg-danger-soft/95"
        : "border-line bg-card/90";
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-2 sm:mx-0">
      <div className={`pb-safe border-t-2 px-4 pt-3 backdrop-blur-xl backdrop-saturate-150 sm:rounded-2xl sm:border-2 sm:pb-3 ${fundo}`}>
        {children}
      </div>
    </div>
  );
}

