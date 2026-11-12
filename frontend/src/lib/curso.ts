// Tipos do curso autoguiado. Contrato completo em docs/api-curso.md.

export type Etapa = "controlada" | "semicontrolada" | "producao" | "quiz";
export type TipoExercicio = "sequence" | "mcq" | "cloze" | "word_order" | "match" | "translate" | "error_correction" | "dictation";
export type Habilidade = "gramatica_vocabulario" | "leitura" | "escrita";
export type StatusConteudo = "rascunho" | "revisao" | "publicado";

export type Midia = {
  tipo: "audio" | "video" | "musica";
  modo: "arquivo" | "youtube" | "link" | "voz";
  titulo: string;
  fonte: string;
  url?: string;
  transcricao?: string;
  orientacao: string;
  inicio?: number;
  fim?: number;
};

export type Missao = { titulo: string; enunciado: string; criterios: string[]; exemplo: string };

export type ConteudoExercicio =
  | { tipo: "sequence"; conteudo: { midia?: Midia; trechos: string[] } }
  | { tipo: "mcq"; conteudo: { midia?: Midia; opcoes: string[]; texto?: string } }
  | { tipo: "cloze"; conteudo: { midia?: Midia; texto: string; opcoesPorLacuna?: string[][] } }
  | { tipo: "word_order"; conteudo: { midia?: Midia; palavras: string[] } }
  | { tipo: "match"; conteudo: { midia?: Midia; esquerda: string[]; direita: string[] } }
  | { tipo: "translate"; conteudo: { midia?: Midia; frase: string; direcao: "pt-en" | "en-pt" } }
  | { tipo: "error_correction"; conteudo: { midia?: Midia; frase: string } }
  // Ditado: `frase` é falada pela voz do navegador e nunca aparece escrita antes da resposta. Não aceita mídia.
  | { tipo: "dictation"; conteudo: { midia?: undefined; frase: string; dica?: string } };

/** Resposta enviada ao backend, por tipo: mcq → índice; cloze → textos por lacuna;
 *  word_order → palavras na ordem; match → índice em `direita` para cada item de `esquerda`;
 *  translate/error_correction/dictation → texto. */
export type Resposta = number | string | string[] | number[];

export type ExercicioPublico = { id: number; ordem: number; etapa: Etapa; enunciado: string } & ConteudoExercicio;
export type ItemTestePublico = { id: number; ordem: number; habilidade: Habilidade; enunciado: string } & ConteudoExercicio;

export type Resultado = {
  correto: boolean;
  pontuacao: number;
  respostaEsperada: string;
  explicacao: string;
};

export type Apresentacao = {
  recursos?: Midia[];
  missao?: Missao;
  explicacao: string[];
  regras?: string[];
  notaContrastiva?: string;
  exemplos: { en: string; pt: string }[];
  vocabulario?: { en: string; pt: string }[];
};

export type PerfilAprendiz = {
  xp: number;
  ofensivaAtual: number;
  ofensivaMaxima: number;
  metodologia: string;
  revisoesPendentes: number;
  /** Meta de XP por dia (10, 30 ou 60). */
  metaDiariaXp: number;
  /** XP ganho hoje (fuso de Brasília). */
  xpHoje: number;
  /** Ainda não passou pelas boas-vindas. */
  onboardingPendente: boolean;
  /** Aceitou receber lembretes de estudo por e-mail. */
  lembretesEmail: boolean;
};

export type LicaoResumo = {
  id: number;
  ordem: number;
  titulo: string;
  objetivo: string;
  minutosEstimados: number;
  desbloqueada: boolean;
  concluida: boolean;
  melhorPercentual: number;
};

export type ModuloTrilha = {
  id: number;
  slug: string;
  ordem: number;
  titulo: string;
  tema: string;
  descricao: string;
  canDos: string[];
  gramatica: string;
  vocabulario: string;
  funcao: string;
  desbloqueado: boolean;
  licoesConcluidas: number;
  totalLicoes: number;
  teste: {
    /** Todas as lições concluídas e fora da espera. */
    disponivel: boolean;
    /** Dá para fazer o teste sem concluir as lições (módulo liberado, não aprovado, fora da espera). */
    podeAdiantar: boolean;
    aprovado: boolean;
    melhorPercentual: number | null;
    tentativas: number;
    bloqueadoAte: string | null;
  };
  licoes: LicaoResumo[];
};

export type Trilha = {
  perfil: PerfilAprendiz;
  niveis: { id: number; codigo: string; nome: string; descricao: string | null; modulos: ModuloTrilha[] }[];
};

export type LicaoDetalhe = {
  id: number;
  slug: string;
  ordem: number;
  titulo: string;
  objetivo: string;
  minutosEstimados: number;
  modulo: { id: number; slug: string; titulo: string; ordem: number };
  apresentacao: Apresentacao;
  exercicios: ExercicioPublico[];
  progresso: { concluida: boolean; melhorPercentual: number; tentativas: number };
  proximaLicaoId: number | null;
  nota: NotaLicao | null;
};

export type NotaLicao = { texto: string; atualizadoEm: string };

export type ResultadoQuiz = {
  percentual: number;
  aprovado: boolean;
  resultados: ({ exercicioId: number } & Resultado)[];
  xpGanho: number;
  licaoConcluida: boolean;
  proximaLicaoId: number | null;
};

export type ItemRevisao = ExercicioPublico & { caixa: number; licaoTitulo: string };

export type ResultadoTeste = {
  percentual: number;
  porHabilidade: Record<string, number>;
  aprovado: boolean;
  resultados: ({ itemId: number; habilidade: Habilidade } & Resultado)[];
  xpGanho: number;
  bloqueadoAte: string | null;
  proximoModuloId: number | null;
};

// ─── Professora ─────────────────────────────────────────────────────────────

export type ExercicioCompleto = {
  id?: number;
  ordem?: number;
  etapa: Etapa;
  enunciado: string;
  explicacao: string;
  tagsErro?: string[] | null;
} & ConteudoExercicio & { gabarito: Record<string, unknown> };

export type LicaoEdicao = {
  id: number;
  slug: string;
  ordem: number;
  titulo: string;
  objetivo: string;
  minutosEstimados: number;
  status: StatusConteudo;
  apresentacao: Apresentacao;
  modulo: { id: number; slug: string; titulo: string };
  exercicios: ExercicioCompleto[];
};

export const rotuloEtapa: Record<Etapa, string> = {
  controlada: "Prática controlada",
  semicontrolada: "Prática semicontrolada",
  producao: "Produção",
  quiz: "Mini-quiz",
};

export const rotuloHabilidade: Record<Habilidade, string> = {
  gramatica_vocabulario: "Gramática e vocabulário",
  leitura: "Leitura",
  escrita: "Escrita",
};

export const rotuloStatus: Record<StatusConteudo, string> = {
  rascunho: "Rascunho",
  revisao: "Em revisão",
  publicado: "Publicado",
};

// ─── Helpers do aluno ───────────────────────────────────────────────────────

/** Ordem das etapas da prática (PPP) e das habilidades no teste. */
export const ordemEtapas: Etapa[] = ["controlada", "semicontrolada", "producao", "quiz"];
export const ordemHabilidades: Habilidade[] = ["gramatica_vocabulario", "leitura", "escrita"];

/** Limiares exibidos ao aluno (a regra de verdade está em backend/src/domain/progresso.ts). */
export const LIMIAR_QUIZ = 80;
export const LIMIAR_TESTE_TOTAL = 75;
export const LIMIAR_TESTE_HABILIDADE = 60;

/** Exercício ou item de teste, sem gabarito — o que os componentes de `components/curso` renderizam. */
export type ItemRenderizavel = { id: number; enunciado: string } & ConteudoExercicio;

/** Diz se a resposta está completa o bastante para ser enviada. */
export function respostaPreenchida(item: ItemRenderizavel, r: Resposta | undefined): boolean {
  if (r === undefined) return false;
  switch (item.tipo) {
    case "sequence":
      return Array.isArray(r) && r.length === item.conteudo.trechos.length && new Set<string | number>(r).size === r.length && r.every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < item.conteudo.trechos.length);
    case "mcq":
      return typeof r === "number" && r >= 0;
    case "cloze": {
      const lacunas = item.conteudo.texto.split("___").length - 1;
      return Array.isArray(r) && r.length >= lacunas && (r as string[]).slice(0, lacunas).every((t) => String(t).trim() !== "");
    }
    case "word_order":
      return Array.isArray(r) && r.length > 0;
    case "match":
      return (
        Array.isArray(r) &&
        r.length === item.conteudo.esquerda.length &&
        (r as number[]).every((i) => typeof i === "number" && i >= 0)
      );
    case "translate":
    case "error_correction":
    case "dictation":
      return typeof r === "string" && r.trim() !== "";
  }
}

/** Resposta "vazia" no formato que o backend aceita (resposta ausente conta como errada). */
export function respostaParaEnvio(item: ItemRenderizavel, r: Resposta | undefined): Resposta {
  if (r !== undefined) return r;
  switch (item.tipo) {
    case "mcq":
      return -1;
    case "sequence":
      return [] as number[];
    case "cloze":
    case "word_order":
      return [] as string[];
    case "match":
      return item.conteudo.esquerda.map(() => -1);
    default:
      return "";
  }
}

/** Texto legível da resposta do aluno (para a revisão de resultados). */
export function formatarResposta(item: ItemRenderizavel, r: Resposta | undefined): string {
  if (r === undefined) return "—";
  switch (item.tipo) {
    case "sequence":
      return Array.isArray(r) && r.length ? (r as number[]).map((i) => item.conteudo.trechos[i] ?? "?").join(" → ") : "—";
    case "mcq":
      return typeof r === "number" && r >= 0 ? (item.conteudo.opcoes[r] ?? "—") : "—";
    case "cloze":
      return Array.isArray(r) && r.length ? (r as string[]).map((t) => t || "…").join(" / ") : "—";
    case "word_order":
      return Array.isArray(r) && r.length ? (r as string[]).join(" ") : "—";
    case "match": {
      const { esquerda, direita } = item.conteudo;
      if (!Array.isArray(r)) return "—";
      return esquerda.map((e, i) => `${e} → ${direita[(r as number[])[i]] ?? "?"}`).join("; ");
    }
    default:
      return typeof r === "string" && r.trim() ? r : "—";
  }
}

/** Lê `{ error }` de uma resposta de erro da API. */
export async function lerErroApi(res: Response, padrao: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === "string" ? data.error : padrao;
  } catch {
    return padrao;
  }
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Próximo passo na trilha: a primeira lição liberada e não concluída, ou o teste de módulo disponível. */
export type ProximoPasso =
  | { tipo: "licao"; modulo: ModuloTrilha; licao: LicaoResumo }
  | { tipo: "teste"; modulo: ModuloTrilha }
  | { tipo: "espera"; modulo: ModuloTrilha; bloqueadoAte: string }
  | { tipo: "fim" }
  | { tipo: "vazio" };

export function proximoPasso(trilha: Trilha): ProximoPasso {
  const modulos = trilha.niveis.flatMap((n) => n.modulos);
  if (modulos.length === 0) return { tipo: "vazio" };
  // Lição pendente em módulo já aprovado (teste adiantado): fica aberta, mas só vira o próximo passo
  // quando não há mais nada à frente na trilha.
  let pendenteEmAprovado: ProximoPasso | null = null;
  for (const m of modulos) {
    if (!m.desbloqueado) continue;
    const licao = m.licoes.find((l) => l.desbloqueada && !l.concluida);
    if (licao && m.teste.aprovado) {
      pendenteEmAprovado ??= { tipo: "licao", modulo: m, licao };
      continue;
    }
    if (licao) return { tipo: "licao", modulo: m, licao };
    if (!m.teste.aprovado) {
      if (m.teste.bloqueadoAte && new Date(m.teste.bloqueadoAte) > new Date()) {
        return { tipo: "espera", modulo: m, bloqueadoAte: m.teste.bloqueadoAte };
      }
      if (m.teste.disponivel) return { tipo: "teste", modulo: m };
    }
  }
  return pendenteEmAprovado ?? { tipo: "fim" };
}

/** A resposta esperada é uma frase em inglês (para oferecer o áudio de pronúncia)? */
export function respostaEmIngles(item: ConteudoExercicio): boolean {
  if (item.tipo === "match" || item.tipo === "sequence") return false;
  if (item.tipo === "translate") return item.conteudo.direcao === "pt-en";
  return true;
}

// ─── Conquistas e certificados (GET /curso/conquistas, /curso/certificados, /certificados/:codigo) ───

export interface Conquista {
  id: string;
  titulo: string;
  descricao: string;
  obtida: boolean;
  /** Só nas conquistas de contagem; `atual` nunca passa de `alvo`. */
  progresso?: { atual: number; alvo: number };
}

export interface CertificadoEmitido {
  codigo: string;
  emitidoEm: string;
  nomeAluno: string;
}

export interface CertificadoNivel {
  nivel: { id: number; codigo: string; nome: string };
  concluido: boolean;
  modulosAprovados: number;
  totalModulos: number;
  certificado: CertificadoEmitido | null;
}

/** Resposta da conferência pública: nada além do que está impresso no certificado. */
export interface CertificadoPublico {
  nomeAluno: string;
  nivel: { codigo: string; nome: string };
  emitidoEm: string;
}
