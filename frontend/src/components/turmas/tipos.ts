import type { ArquivoResumo } from "@/lib/arquivos";

/** Respostas da API usadas nas telas de turmas (professora e aluno). */

export type StatusEntrega = "pendente" | "corrigido" | "aprovado" | "reprovado";

export type TurmaResumo = {
  id: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  criadoEm?: string;
  professor?: { nome: string };
  _count?: { matriculas: number };
};

export type AtividadeBase = {
  id: number;
  titulo: string;
  descricao: string;
  dataEntrega: string;
  arquivoObrigatorio?: boolean;
  link?: string | null;
  /** Anexo da professora: "/api/arquivos/<id>" */
  arquivoUrl?: string | null;
  arquivo?: ArquivoResumo | null;
};

export type TurmaDetalhe = TurmaResumo & {
  professor: { nome: string };
  atividades: AtividadeBase[];
  materiais: { id: number; titulo: string }[];
  matriculas: { aluno: { id: number; nome: string; email: string } }[];
};

export type Feedback = {
  comentario: string;
  nota: number;
  criadoEm?: string;
  professor?: { nome: string };
};

export type Entrega = {
  id: number;
  conteudo: string | null;
  /** "/api/arquivos/<id>" (privado) */
  arquivoUrl: string | null;
  arquivo: ArquivoResumo | null;
  dataEnvio: string;
  status: StatusEntrega;
  aluno: { id?: number; nome: string };
  feedback: Feedback | null;
};

/** GET /turmas/:id/atividades — a professora recebe todas as entregas; o aluno, só as dele (com feedback). */
export type AtividadeComEntregas = AtividadeBase & { submissoes: Entrega[] };

export type Aviso = {
  id: number;
  titulo: string;
  conteudo: string | null;
  link: string | null;
  criadoEm: string;
};

export type Material = {
  id: number;
  titulo: string;
  tipo: "pdf" | "audio" | "video" | "link" | string;
  /** "/api/arquivos/<id>" (upload, privado) ou URL externa (link) */
  urlArquivo: string;
  arquivo: ArquivoResumo | null;
  criadoEm: string;
};

export type FeedbackDoAluno = {
  id: number;
  comentario: string;
  nota: number;
  criadoEm: string;
  professor: { nome: string };
  submissao: { atividade: { id: number; titulo: string; turmaId: number } };
};
