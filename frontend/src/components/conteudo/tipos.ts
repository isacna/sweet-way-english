// Tipos de resposta das rotas da professora (docs/api-curso.md, seção "Professora")
// que não estão em src/lib/curso.ts.

import type { Habilidade, StatusConteudo, TipoExercicio } from "@/lib/curso";

export type LicaoPainel = {
  id: number;
  ordem: number;
  slug: string;
  titulo: string;
  status: StatusConteudo;
  totalExercicios: number;
  atualizadoEm: string;
  revisadoEm: string | null;
};

export type ModuloPainel = {
  id: number;
  slug: string;
  ordem: number;
  titulo: string;
  tema: string;
  status: StatusConteudo;
  totalItensTeste: number;
  licoes: LicaoPainel[];
};

export type PainelConteudo = {
  niveis: { id: number; codigo: string; nome: string; modulos: ModuloPainel[] }[];
};

export type ItemTesteCompleto = {
  id: number;
  forma: number;
  ordem: number;
  habilidade: Habilidade;
  tipo: TipoExercicio;
  enunciado: string;
  conteudo: unknown;
  gabarito: unknown;
  explicacao: string;
};

export type TesteModuloProfessora = {
  modulo: { id: number; slug: string; titulo: string };
  formas: { forma: number; itens: ItemTesteCompleto[] }[];
};

export type ProgressoTurma = {
  modulos: { id: number; slug: string; ordem: number; titulo: string; totalLicoes: number }[];
  alunos: {
    id: number;
    nome: string;
    email: string;
    xp: number;
    ofensivaAtual: number;
    ultimoEstudoEm: string | null;
    revisoesPendentes: number;
    turmas: { id: number; nome: string }[];
    modulos: {
      moduloId: number;
      licoesConcluidas: number;
      testeAprovado: boolean;
      melhorPercentualTeste: number | null;
      tentativasTeste: number;
    }[];
  }[];
};
