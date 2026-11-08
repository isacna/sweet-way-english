"use client";

/**
 * Peças visuais das áreas de turmas (professora e aluno): cabeçalho de página, seções, mensagens,
 * estados de carregamento/vazio, selos, campos de formulário e classes de botão.
 * Só usa tokens (`card`, `ink`, `line`, `accent`…), então funciona no tema claro e no escuro.
 */

import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

// ─── Botões ──────────────────────────────────────────────────────────────────

export type VarianteBotao = "primario" | "secundario" | "perigo" | "perigoContorno" | "fantasma";

const baseBotao =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-55";

/** Classes de botão (use em <button> e em <Link>). Alvo de toque ≥ 44px. */
export function classeBotao(variante: VarianteBotao = "primario", extra = "") {
  const v: Record<VarianteBotao, string> = {
    primario:
      "bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.18)] hover:bg-accent-strong",
    secundario: "border border-line-strong bg-card text-ink shadow-sm hover:border-gray-300 hover:bg-gray-50",
    perigo: "bg-danger text-white hover:bg-danger-strong",
    perigoContorno: "border border-danger-bright/50 bg-card text-danger-ink hover:bg-danger-soft",
    fantasma: "text-ink-soft hover:bg-gray-100 hover:text-ink",
  };
  return `${baseBotao} ${v[variante]} ${extra}`.trim();
}

/** Link/ação em texto, ainda com 44px de altura para o toque. */
export const classeLinkAcao =
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 -mx-2 text-sm font-semibold text-accent hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-50";

// ─── Formulários ─────────────────────────────────────────────────────────────

/** Campo de texto/select/textarea. `text-base` no celular evita o zoom automático do iOS. */
export const classeCampo =
  "block min-h-[44px] w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-base text-ink shadow-[inset_0_1px_1px_rgb(0_0_0/0.04)] transition-colors placeholder:text-ink-faint hover:border-gray-300 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

/** <input type="file"> com o botão nativo estilizado. */
export const classeArquivo =
  "block w-full cursor-pointer rounded-xl border border-dashed border-line-strong bg-gray-50 p-2 text-sm text-ink-soft file:mr-3 file:min-h-[40px] file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-4 file:text-sm file:font-semibold file:text-white hover:border-gray-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20";

export const classeRotulo = "mb-1.5 block text-sm font-semibold text-ink";

export function Campo({
  id,
  rotulo,
  dica,
  opcional,
  obrigatorio,
  className = "",
  children,
}: {
  id: string;
  rotulo: ReactNode;
  dica?: ReactNode;
  opcional?: boolean;
  obrigatorio?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
        {opcional && <span className="font-normal text-ink-faint"> (opcional)</span>}
        {obrigatorio && (
          <span className="text-danger-ink" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {dica && (
        <p id={`${id}-dica`} className="mt-1.5 text-xs text-ink-soft">
          {dica}
        </p>
      )}
    </div>
  );
}

/** Checkbox com o texto clicável e área de toque confortável. */
export function CaixaMarcar({
  id,
  checked,
  onChange,
  children,
  required,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-line bg-gray-50 px-3.5 py-3 text-sm text-ink hover:border-line-strong"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        required={required}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
      />
      <span>{children}</span>
    </label>
  );
}

// ─── Estrutura da página ─────────────────────────────────────────────────────

export function Cabecalho({
  voltar,
  eyebrow,
  titulo,
  descricao,
  acoes,
}: {
  voltar?: { href: string; rotulo: string };
  eyebrow?: ReactNode;
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      {voltar && (
        <Link
          href={voltar.href}
          className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-soft hover:bg-gray-100 hover:text-ink"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1 text-accent">{eyebrow}</p>}
          <h1 className="break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-3xl">
            {titulo}
          </h1>
          {descricao && <div className="mt-1.5 max-w-2xl text-ink-soft">{descricao}</div>}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{acoes}</div>}
      </div>
    </header>
  );
}

/** Cartão de seção com título, descrição e ação opcional à direita. */
export function Secao({
  titulo,
  descricao,
  acao,
  id,
  className = "",
  children,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const tituloId = id ? `${id}-titulo` : undefined;
  return (
    <section id={id} aria-labelledby={tituloId} className={`card p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={tituloId} className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 text-sm text-ink-soft">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

// ─── Estados ─────────────────────────────────────────────────────────────────

export function Carregando({ texto = "Carregando…", className = "" }: { texto?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 py-6 ${className}`} role="status">
      <span
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent"
        aria-hidden
      />
      <span className="text-sm font-medium text-ink-soft">{texto}</span>
    </div>
  );
}

export function Vazio({
  icone,
  titulo,
  texto,
  acao,
  compacto,
}: {
  icone?: ReactNode;
  titulo: ReactNode;
  texto?: ReactNode;
  acao?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-gray-50 text-center ${
        compacto ? "px-4 py-6" : "px-6 py-10"
      }`}
    >
      {icone && (
        <span
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent [&>svg]:h-6 [&>svg]:w-6"
          aria-hidden
        >
          {icone}
        </span>
      )}
      <p className="font-semibold text-ink">{titulo}</p>
      {texto && <p className="mt-1 max-w-md text-sm text-ink-soft">{texto}</p>}
      {acao && <div className="mt-4 flex flex-wrap justify-center gap-2">{acao}</div>}
    </div>
  );
}

type TomMensagem = "erro" | "sucesso" | "info" | "alerta";

const estiloMensagem: Record<TomMensagem, { classe: string; Icone: typeof Info }> = {
  erro: { classe: "border-danger-bright/40 bg-danger-soft text-danger-ink", Icone: CircleAlert },
  sucesso: { classe: "border-success-bright/40 bg-success-soft text-success-ink", Icone: CircleCheck },
  info: { classe: "border-accent/25 bg-accent-soft text-ink", Icone: Info },
  alerta: { classe: "border-sun/40 bg-sun-soft text-sun-ink", Icone: TriangleAlert },
};

/**
 * Faixa de mensagem. Erros usam role="alert" (lidos na hora); os outros, role="status".
 * Para anunciar resultados assíncronos, deixe a <RegiaoAoVivo> montada e troque só o texto.
 */
export function Mensagem({
  tom = "info",
  children,
  className = "",
}: {
  tom?: TomMensagem;
  children: ReactNode;
  className?: string;
}) {
  const { classe, Icone } = estiloMensagem[tom];
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium ${classe} ${className}`}
    >
      <Icone aria-hidden className="mt-px h-[18px] w-[18px] shrink-0" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}

/** Região aria-live sempre montada; mostra uma <Mensagem> quando há texto. */
export function RegiaoAoVivo({
  mensagem,
  className = "",
}: {
  mensagem: { tom: TomMensagem; texto: string } | null;
  className?: string;
}) {
  return (
    <div aria-live="polite" aria-atomic="true" className={mensagem ? className : undefined}>
      {mensagem && (
        <Mensagem tom={mensagem.tom} className="!m-0">
          {mensagem.texto}
        </Mensagem>
      )}
    </div>
  );
}

// ─── Selos ───────────────────────────────────────────────────────────────────

export type TomSelo = "neutro" | "accent" | "sucesso" | "perigo" | "sol" | "chama";

const coresSelo: Record<TomSelo, string> = {
  neutro: "bg-gray-100 text-ink-soft ring-gray-200",
  accent: "bg-accent-soft text-accent ring-accent/25",
  sucesso: "bg-success-soft text-success-ink ring-success-bright/40",
  perigo: "bg-danger-soft text-danger-ink ring-danger-bright/40",
  sol: "bg-sun-soft text-sun-ink ring-sun/40",
  chama: "bg-flame-soft text-flame-ink ring-flame/30",
};

export function Selo({ tom = "neutro", children }: { tom?: TomSelo; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${coresSelo[tom]}`}
    >
      {children}
    </span>
  );
}

// ─── Erros da API ────────────────────────────────────────────────────────────

/** `{ error }` da resposta, ou o texto padrão. `null` = sem conexão. */
export async function erroDaApi(res: Response | null, padrao: string): Promise<string> {
  if (!res) return "Sem conexão com o servidor. Confira sua internet e tente de novo.";
  try {
    const data = await res.json();
    return typeof data?.error === "string" && data.error ? data.error : padrao;
  } catch {
    return padrao;
  }
}

/** Iniciais para o avatar ("Ana Souza" → "AS"). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent ${
        tamanho === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
      }`}
    >
      {iniciais(nome)}
    </span>
  );
}
