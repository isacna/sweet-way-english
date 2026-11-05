"use client";

import { Fragment, useMemo } from "react";
import type { Apresentacao } from "@/lib/curso";
import { falar } from "./BotaoOuvir";

// Destaca, dentro do texto em português, os trechos em inglês que a lição ensina.
// Fontes: *asteriscos* escritos no conteúdo (marcação explícita) e os termos do vocabulário e das regras.

// Palavras curtas que existem em português e virariam falso destaque
const IGNORAR = new Set(["a", "e", "i", "o", "no", "do", "me", "se", "as", "is", "on", "in", "to", "am", "an", "be"]);

function limparTermo(t: string) {
  return t
    .replace(/\(.*?\)/g, "")
    .replace(/[.!?,;:]+$/, "")
    .trim();
}

/** Termos em inglês da lição: vocabulário ("hi / hello") e o lado esquerdo das regras ("I'm Ana = Eu sou a Ana"). */
export function termosDaLicao(ap: Apresentacao): string[] {
  const termos = new Set<string>();
  const add = (bruto: string) => {
    for (const parte of bruto.split("/")) {
      const t = limparTermo(parte);
      if (t.length >= 2 && !IGNORAR.has(t.toLowerCase())) termos.add(t);
    }
  };
  for (const v of ap.vocabulario ?? []) add(v.en);
  for (const r of ap.regras ?? []) {
    const lados = r.split("=").map((s) => s.trim());
    if (lados.length > 1) lados.slice(0, -1).forEach(add);
  }
  // Mais longos primeiro: "Good night" ganha de "night"
  return [...termos].sort((a, b) => b.length - a.length);
}

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Termo({ texto }: { texto: string }) {
  return (
    <button
      type="button"
      lang="en"
      onClick={() => falar(texto)}
      title="Ouvir"
      aria-label={`${texto} (ouvir)`}
      className="inline rounded-md bg-grape-soft px-1 py-px font-semibold text-grape decoration-grape/40 decoration-dotted underline-offset-4 transition-colors [box-decoration-break:clone] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-grape/40"
    >
      {texto}
    </button>
  );
}

/** Forma errada citada na nota contrastiva ("não diga *I'm the Ana*"): riscada e sem áudio, para não ser "ensinada". */
function TermoErrado({ texto }: { texto: string }) {
  return (
    <s lang="en" className="rounded-md bg-danger-soft px-1 py-px font-semibold text-danger-ink decoration-2 [box-decoration-break:clone]">
      <span className="sr-only">forma errada: </span>
      {texto}
    </s>
  );
}

const ANTES_ERRADO = /n[ãa]o\s+(diga|use|escreva|fale)\s*$/i;

/** Texto com os termos em inglês destacados (clicáveis para ouvir). */
export function TextoDestacado({ texto, termos }: { texto: string; termos: string[] }) {
  const regex = useMemo(() => {
    if (termos.length === 0) return null;
    // Fronteira: não pode estar colado a letra (inclui acentos) nem a apóstrofo
    return new RegExp(`(?<![\\p{L}'’])(${termos.map(escaparRegex).join("|")})(?![\\p{L}'’])`, "giu");
  }, [termos]);

  // 1º: *marcação explícita*; 2º: termos conhecidos no resto do texto
  const blocos = texto.split(/\*([^*]+)\*/g);
  return (
    <>
      {blocos.map((bloco, i) => {
        if (i % 2 === 1)
          return ANTES_ERRADO.test(blocos[i - 1]) ? <TermoErrado key={i} texto={bloco} /> : <Termo key={i} texto={bloco} />;
        if (!regex) return <Fragment key={i}>{bloco}</Fragment>;
        const partes = bloco.split(regex);
        return (
          <Fragment key={i}>
            {partes.map((p, j) => (j % 2 === 1 ? <Termo key={j} texto={p} /> : <Fragment key={j}>{p}</Fragment>))}
          </Fragment>
        );
      })}
    </>
  );
}
