// Modelo de formulário do editor de lições (só professora).
// O estado do editor guarda tudo como texto editável; `paraPayload` converte para o formato
// validado pelo backend (`licaoEdicaoSchema` em backend/src/domain/conteudo/schema.ts).

import type {
  Apresentacao,
  Midia,
  Missao,
  Etapa,
  ExercicioCompleto,
  LicaoEdicao,
  TipoExercicio,
} from "@/lib/curso";

export const ORDEM_ETAPAS: Etapa[] = ["controlada", "semicontrolada", "producao", "quiz"];

export const TIPOS: TipoExercicio[] = [
  "sequence",
  "mcq",
  "cloze",
  "word_order",
  "match",
  "translate",
  "error_correction",
  "dictation",
];

export const rotuloTipo: Record<TipoExercicio, string> = {
  sequence: "Ordenar acontecimentos / diálogo",
  mcq: "Múltipla escolha",
  cloze: "Lacunas",
  word_order: "Ordenar palavras",
  match: "Associar pares",
  translate: "Tradução",
  error_correction: "Corrigir o erro",
  dictation: "Ditado (ouvir e escrever)",
};

export const MARCADOR_LACUNA = "___";

export type ParForm = { esquerda: string; direita: string };

/** Um exercício no editor. Campos de todos os tipos ficam juntos para permitir trocar o tipo sem perder texto. */
export type ExercicioForm = {
  midia?: Midia;
  chave: string;
  id?: number;
  etapa: Etapa;
  tipo: TipoExercicio;
  enunciado: string;
  explicacao: string;
  tagsErro: string; // separadas por vírgula
  // mcq
  opcoes: string[];
  correta: number;
  textoApoio: string;
  // cloze
  textoCloze: string;
  respostasLacunas: string[]; // uma string por lacuna, respostas aceitas uma por linha
  usarOpcoesLacuna: boolean;
  opcoesLacunas: string[]; // uma string por lacuna, opções uma por linha
  // word_order
  palavras: string; // uma por linha (ou separadas por espaço)
  // word_order, translate, error_correction, dictation
  aceitas: string; // uma por linha
  // match
  pares: ParForm[];
  // translate / error_correction / dictation (a frase falada)
  frase: string;
  direcao: "pt-en" | "en-pt";
  // dictation
  dica: string;
};

export type LinhaPar = { en: string; pt: string };

export type ApresentacaoForm = {
  recursos?: Midia[];
  missao?: Missao;
  explicacao: string[];
  regras: string[];
  notaContrastiva: string;
  exemplos: LinhaPar[];
  vocabulario: LinhaPar[];
};

export type LicaoForm = {
  titulo: string;
  objetivo: string;
  minutosEstimados: string;
  apresentacao: ApresentacaoForm;
  exercicios: ExercicioForm[];
};

/** Formato enviado ao backend para um exercício (também usado em POST /conteudo/exercicios/verificar). */
export type ExercicioPayload = {
  id?: number;
  etapa: Etapa;
  tipo: TipoExercicio;
  enunciado: string;
  explicacao: string;
  tagsErro?: string[];
  conteudo: Record<string, unknown>;
  gabarito: Record<string, unknown>;
};

export type LicaoPayload = {
  titulo: string;
  objetivo: string;
  minutosEstimados: number;
  apresentacao: Apresentacao;
  exercicios: ExercicioPayload[];
};

let contadorChave = 0;
export function novaChave(): string {
  contadorChave += 1;
  return `ex-${Date.now().toString(36)}-${contadorChave}`;
}

export function linhas(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Banco de palavras: uma por linha; se houver uma linha só, separa por espaços. */
export function palavrasDoBanco(texto: string): string[] {
  const ls = linhas(texto);
  if (ls.length <= 1) return (ls[0] ?? "").split(/\s+/).filter(Boolean);
  return ls;
}

export function contarLacunas(texto: string): number {
  return texto.split(MARCADOR_LACUNA).length - 1;
}

export function exercicioVazio(etapa: Etapa, tipo: TipoExercicio): ExercicioForm {
  return {
    chave: novaChave(),
    etapa,
    tipo,
    enunciado: "",
    explicacao: "",
    tagsErro: "",
    opcoes: ["", ""],
    correta: 0,
    textoApoio: "",
    textoCloze: "",
    respostasLacunas: [],
    usarOpcoesLacuna: false,
    opcoesLacunas: [],
    palavras: "",
    aceitas: "",
    pares: [
      { esquerda: "", direita: "" },
      { esquerda: "", direita: "" },
    ],
    frase: "",
    direcao: "pt-en",
    dica: "",
  };
}

type Qualquer = Record<string, unknown>;
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function exercicioParaForm(ex: ExercicioCompleto): ExercicioForm {
  const f = exercicioVazio(ex.etapa, ex.tipo);
  f.id = ex.id;
  f.enunciado = ex.enunciado ?? "";
  f.explicacao = ex.explicacao ?? "";
  f.tagsErro = (ex.tagsErro ?? []).join(", ");
  const c = (ex.conteudo ?? {}) as Qualquer;
  f.midia = c.midia as Midia | undefined;
  const g = (ex.gabarito ?? {}) as Qualquer;
  switch (ex.tipo) {
    case "sequence":
      f.palavras = (Array.isArray(g.ordem) ? (g.ordem as number[]).map((i) => lista(c.trechos)[i]) : lista(c.trechos)).join("\n");
      break;
    case "mcq":
      f.opcoes = lista(c.opcoes);
      if (f.opcoes.length < 2) f.opcoes = [...f.opcoes, "", ""].slice(0, 2);
      f.correta = typeof g.correta === "number" ? g.correta : 0;
      f.textoApoio = typeof c.texto === "string" ? c.texto : "";
      break;
    case "cloze": {
      f.textoCloze = String(c.texto ?? "");
      const respostas = Array.isArray(g.respostas) ? (g.respostas as unknown[]) : [];
      f.respostasLacunas = respostas.map((r) => lista(r).join("\n"));
      const opcoes = Array.isArray(c.opcoesPorLacuna) ? (c.opcoesPorLacuna as unknown[]) : null;
      f.usarOpcoesLacuna = !!opcoes;
      f.opcoesLacunas = opcoes ? opcoes.map((o) => lista(o).join("\n")) : [];
      break;
    }
    case "word_order":
      f.palavras = lista(c.palavras).join("\n");
      f.aceitas = lista(g.aceitas).join("\n");
      break;
    case "match": {
      const esq = lista(c.esquerda);
      const dir = lista(c.direita);
      const pares = Array.isArray(g.pares) ? (g.pares as number[]) : [];
      f.pares = esq.map((e, i) => ({ esquerda: e, direita: dir[pares[i]] ?? "" }));
      break;
    }
    case "translate":
      f.frase = String(c.frase ?? "");
      f.direcao = c.direcao === "en-pt" ? "en-pt" : "pt-en";
      f.aceitas = lista(g.aceitas).join("\n");
      break;
    case "error_correction":
      f.frase = String(c.frase ?? "");
      f.aceitas = lista(g.aceitas).join("\n");
      break;
    case "dictation":
      f.midia = undefined; // ditado não aceita mídia: a própria frase é o áudio
      f.frase = String(c.frase ?? "");
      f.dica = typeof c.dica === "string" ? c.dica : "";
      f.aceitas = lista(g.aceitas).join("\n");
      break;
  }
  return f;
}

function linhasPar(v: { en: string; pt: string }[] | undefined): LinhaPar[] {
  return (v ?? []).map((p) => ({ en: p.en, pt: p.pt }));
}

export function licaoParaForm(l: LicaoEdicao): LicaoForm {
  const a = l.apresentacao ?? ({ explicacao: [], exemplos: [] } as Apresentacao);
  return {
    titulo: l.titulo,
    objetivo: l.objetivo,
    minutosEstimados: String(l.minutosEstimados),
    apresentacao: {
      recursos: a.recursos,
      missao: a.missao,
      explicacao: a.explicacao?.length ? [...a.explicacao] : [""],
      regras: [...(a.regras ?? [])],
      notaContrastiva: a.notaContrastiva ?? "",
      exemplos: linhasPar(a.exemplos),
      vocabulario: linhasPar(a.vocabulario),
    },
    exercicios: ordenarPorEtapa(l.exercicios.map(exercicioParaForm)),
  };
}

/** Ordenação estável por etapa (a ordem dentro de cada etapa é preservada). */
export function ordenarPorEtapa<T extends { etapa: Etapa }>(itens: T[]): T[] {
  return itens
    .map((item, i) => ({ item, i }))
    .sort(
      (a, b) =>
        ORDEM_ETAPAS.indexOf(a.item.etapa) - ORDEM_ETAPAS.indexOf(b.item.etapa) || a.i - b.i
    )
    .map((x) => x.item);
}

// ─── Embaralhamento estável (match) ─────────────────────────────────────────
// Determinístico a partir do texto: salvar duas vezes o mesmo conteúdo gera a mesma ordem.

function hashTexto(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function permutacaoEstavel(n: number, semente: string): number[] {
  let estado = hashTexto(semente) || 1;
  const aleatorio = () => {
    // mulberry32
    estado = (estado + 0x6d2b79f5) | 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  // Nunca deixa na ordem original (a resposta ficaria óbvia)
  if (n >= 2 && p.every((v, i) => v === i)) p.push(p.shift() as number);
  return p;
}

/** A partir dos pares (esquerda ↔ direita correta), gera `direita` embaralhada e `pares`. */
export function montarMatch(pares: ParForm[]): { esquerda: string[]; direita: string[]; pares: number[] } {
  const validos = pares
    .map((p) => ({ esquerda: p.esquerda.trim(), direita: p.direita.trim() }))
    .filter((p) => p.esquerda || p.direita);
  const esquerda = validos.map((p) => p.esquerda);
  const perm = permutacaoEstavel(validos.length, validos.map((p) => `${p.esquerda}|${p.direita}`).join("¦"));
  // direita[j] = validos[perm[j]].direita → o par de esquerda[i] está em j tal que perm[j] === i
  const direita = perm.map((k) => validos[k].direita);
  const indices = esquerda.map((_, i) => perm.indexOf(i));
  return { esquerda, direita, pares: indices };
}

// ─── Conversão para o backend ───────────────────────────────────────────────

export function exercicioParaPayload(f: ExercicioForm): ExercicioPayload {
  const payload = exercicioSemMidia(f);
  if (f.midia && f.tipo !== "dictation") payload.conteudo.midia = f.midia;
  return payload;
}

function exercicioSemMidia(f: ExercicioForm): ExercicioPayload {
  const tags = f.tagsErro
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const base = {
    ...(f.id ? { id: f.id } : {}),
    etapa: f.etapa,
    tipo: f.tipo,
    enunciado: f.enunciado.trim(),
    explicacao: f.explicacao.trim(),
    ...(tags.length ? { tagsErro: tags } : {}),
  };
  switch (f.tipo) {
    case "sequence": {
      const trechos = linhas(f.palavras);
      const perm = permutacaoEstavel(trechos.length, trechos.join('|'));
      return { ...base, conteudo: { trechos: perm.map((i) => trechos[i]) }, gabarito: { ordem: trechos.map((_, i) => perm.indexOf(i)) } };
    }
    case "mcq": {
      // Remove opções vazias ajustando o índice da correta
      const indices = f.opcoes.map((o, i) => (o.trim() ? i : -1)).filter((i) => i >= 0);
      const opcoes = indices.map((i) => f.opcoes[i].trim());
      const correta = Math.max(0, indices.indexOf(f.correta));
      return {
        ...base,
        conteudo: { opcoes, ...(f.textoApoio.trim() ? { texto: f.textoApoio.trim() } : {}) },
        gabarito: { correta },
      };
    }
    case "cloze": {
      const n = contarLacunas(f.textoCloze);
      const respostas = Array.from({ length: n }, (_, i) => linhas(f.respostasLacunas[i] ?? ""));
      const conteudo: Record<string, unknown> = { texto: f.textoCloze.trim() };
      if (f.usarOpcoesLacuna) {
        conteudo.opcoesPorLacuna = Array.from({ length: n }, (_, i) => linhas(f.opcoesLacunas[i] ?? ""));
      }
      return { ...base, conteudo, gabarito: { respostas } };
    }
    case "word_order":
      return {
        ...base,
        conteudo: { palavras: palavrasDoBanco(f.palavras) },
        gabarito: { aceitas: linhas(f.aceitas) },
      };
    case "match": {
      const m = montarMatch(f.pares);
      return {
        ...base,
        conteudo: { esquerda: m.esquerda, direita: m.direita },
        gabarito: { pares: m.pares },
      };
    }
    case "translate":
      return {
        ...base,
        conteudo: { frase: f.frase.trim(), direcao: f.direcao },
        gabarito: { aceitas: linhas(f.aceitas) },
      };
    case "error_correction":
      return {
        ...base,
        conteudo: { frase: f.frase.trim() },
        gabarito: { aceitas: linhas(f.aceitas) },
      };
    case "dictation":
      return {
        ...base,
        conteudo: { frase: f.frase.trim(), ...(f.dica.trim() ? { dica: f.dica.trim() } : {}) },
        gabarito: { aceitas: aceitasDoDitado(f) },
      };
  }
}

/** Comparação aproximada à do backend, só para os avisos do editor (quem decide é o servidor). */
const semelhante = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?;:,\s]+$/, "");

export const DITADO_MAX_PALAVRAS = 12;

/** Respostas aceitas do ditado: as listadas; sem nenhuma, vale a própria frase falada. */
export function aceitasDoDitado(f: Pick<ExercicioForm, "frase" | "aceitas">): string[] {
  const aceitas = linhas(f.aceitas);
  return aceitas.length || !f.frase.trim() ? aceitas : [f.frase.trim()];
}

const limparPares = (v: LinhaPar[]) =>
  v
    .map((p) => ({ en: p.en.trim(), pt: p.pt.trim() }))
    .filter((p) => p.en || p.pt);

export function licaoParaPayload(f: LicaoForm): LicaoPayload {
  const a = f.apresentacao;
  const regras = a.regras.map((r) => r.trim()).filter(Boolean);
  const vocabulario = limparPares(a.vocabulario);
  const apresentacao: Apresentacao = {
    ...(a.recursos?.length ? { recursos: a.recursos } : {}),
    ...(a.missao ? { missao: { ...a.missao, criterios: a.missao.criterios.map((c) => c.trim()).filter(Boolean) } } : {}),
    explicacao: a.explicacao.map((p) => p.trim()).filter(Boolean),
    exemplos: limparPares(a.exemplos),
    ...(regras.length ? { regras } : {}),
    ...(a.notaContrastiva.trim() ? { notaContrastiva: a.notaContrastiva.trim() } : {}),
    ...(vocabulario.length ? { vocabulario } : {}),
  };
  return {
    titulo: f.titulo.trim(),
    objetivo: f.objetivo.trim(),
    minutosEstimados: Number.parseInt(f.minutosEstimados, 10) || 0,
    apresentacao,
    exercicios: ordenarPorEtapa(f.exercicios).map(exercicioParaPayload),
  };
}

/** Avisos locais (rápidos) para ajudar antes de salvar; o backend continua sendo quem valida. */
export function avisosExercicio(f: ExercicioForm): string[] {
  const avisos: string[] = [];
  if (!f.enunciado.trim()) avisos.push("Falta o enunciado.");
  if (!f.explicacao.trim()) avisos.push("Falta a explicação (feedback mostrado depois da resposta).");
  switch (f.tipo) {
    case "sequence":
      if (linhas(f.palavras).length < 3 || linhas(f.palavras).length > 8) avisos.push("Informe de 3 a 8 acontecimentos, um por linha.");
      break;
    case "mcq": {
      const preenchidas = f.opcoes.filter((o) => o.trim()).length;
      if (preenchidas < 2) avisos.push("Informe pelo menos 2 opções.");
      if (!f.opcoes[f.correta]?.trim()) avisos.push("Marque uma opção preenchida como correta.");
      break;
    }
    case "cloze": {
      const n = contarLacunas(f.textoCloze);
      if (n === 0) avisos.push(`O texto não tem lacunas (${MARCADOR_LACUNA}).`);
      for (let i = 0; i < n; i++) {
        if (!linhas(f.respostasLacunas[i] ?? "").length)
          avisos.push(`Lacuna ${i + 1}: informe pelo menos uma resposta aceita.`);
      }
      break;
    }
    case "word_order":
      if (palavrasDoBanco(f.palavras).length < 2) avisos.push("O banco precisa de pelo menos 2 palavras.");
      if (!linhas(f.aceitas).length) avisos.push("Informe pelo menos uma frase aceita.");
      break;
    case "match": {
      const validos = f.pares.filter((p) => p.esquerda.trim() || p.direita.trim());
      if (validos.length < 2) avisos.push("Informe pelo menos 2 pares.");
      if (validos.some((p) => !p.esquerda.trim() || !p.direita.trim()))
        avisos.push("Há pares com um dos lados vazio.");
      break;
    }
    case "translate":
    case "error_correction":
      if (!f.frase.trim()) avisos.push("Falta a frase.");
      if (!linhas(f.aceitas).length) avisos.push("Informe pelo menos uma resposta aceita.");
      break;
    case "dictation": {
      const frase = semelhante(f.frase);
      if (!frase) {
        avisos.push("Falta a frase que será falada.");
        break;
      }
      if (f.etapa === "quiz") avisos.push("Ditado não pode ficar no mini-quiz: escolha uma etapa de prática.");
      if (/\d/.test(f.frase)) avisos.push("Escreva os números da frase por extenso (algarismos só nas respostas aceitas).");
      if (frase.split(" ").length > DITADO_MAX_PALAVRAS)
        avisos.push(`Frase longa demais para um ditado (máximo ${DITADO_MAX_PALAVRAS} palavras).`);
      if ([f.enunciado, f.dica].some((t) => semelhante(t).includes(frase)))
        avisos.push("O enunciado e a dica não podem conter a frase: o aluno a veria escrita.");
      break;
    }
  }
  return avisos;
}
