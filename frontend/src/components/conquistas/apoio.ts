// Apoio das telas de conquistas e certificado (sem JSX; serve a componentes de cliente e de servidor).

import type { Conquista } from "@/lib/curso";

/** "ABCDEFGHJKMN" → "ABCD-EFGH-JKMN": mais fácil de ler e de digitar. A API aceita com ou sem hífen. */
export function formatarCodigo(codigo: string): string {
  return codigo.match(/.{1,4}/g)?.join("-") ?? codigo;
}

/** "10 de novembro de 2026", no fuso de Brasília (a data não muda conforme onde a página é aberta). */
export function dataPorExtenso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

/** Quanto da conquista já foi feito (0–1). */
export function fracao(c: Conquista): number {
  if (c.obtida) return 1;
  return c.progresso && c.progresso.alvo > 0 ? c.progresso.atual / c.progresso.alvo : 0;
}

/** A conquista ainda não obtida que está mais perto (em empate, a primeira da lista). */
export function proximaConquista(lista: Conquista[]): Conquista | null {
  let melhor: Conquista | null = null;
  for (const c of lista) {
    if (c.obtida) continue;
    if (!melhor || fracao(c) > fracao(melhor)) melhor = c;
  }
  return melhor;
}

/** "4 de 10" ou "1.250 de 2.000". */
export function textoProgresso(p: { atual: number; alvo: number }): string {
  return `${p.atual.toLocaleString("pt-BR")} de ${p.alvo.toLocaleString("pt-BR")}`;
}

/** "A1 — Iniciante", ou só o nome quando ele já traz o código ("Básico 1 (A1)"). */
export function nomeDoNivel(nivel: { codigo: string; nome: string }): string {
  return nivel.nome.includes(nivel.codigo) ? nivel.nome : `${nivel.codigo} — ${nivel.nome}`;
}
