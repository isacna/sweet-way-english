// Regras dos lembretes de estudo por e-mail (opt-in). Funções puras: quem recebe o quê, e quando.
// Os dias são contados no fuso de Brasília, como a ofensiva e a meta diária (domain/progresso.ts).

import { diaLocal } from './progresso.js';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Ofensiva mínima para valer o aviso de "ofensiva em risco" (um dia só ainda não é ofensiva). */
export const OFENSIVA_MINIMA_LEMBRETE = 2;
/** Dias sem estudar em que mandamos "sentimos sua falta". Só nesses, para não insistir todo dia. */
export const DIAS_SAUDADE = [3, 7] as const;
/** Quem abriu o curso e nunca estudou recebe um convite depois destes dias. */
export const DIAS_PRIMEIRA_LICAO = 3;

export type Lembrete =
  /** Estudou ontem, ainda não estudou hoje: a ofensiva de `dias` dias acaba à meia-noite. */
  | { tipo: 'ofensiva'; dias: number }
  /** Último estudo há exatamente `dias` dias. */
  | { tipo: 'saudade'; dias: number }
  /** Nunca estudou e o perfil foi criado há DIAS_PRIMEIRA_LICAO dias. */
  | { tipo: 'primeira-licao' };

export interface PerfilLembrete {
  papel: string;
  lembretesEmail: boolean;
  ultimoLembreteEm: Date | null;
  ultimoEstudoEm: Date | null;
  ofensivaAtual: number;
  criadoEm: Date;
}

/** Dias de calendário (em Brasília) entre dois instantes. */
export function diasCorridos(de: Date, ate: Date) {
  return Math.round((Date.parse(diaLocal(ate)) - Date.parse(diaLocal(de))) / DIA_MS);
}

/**
 * Qual lembrete mandar agora para este perfil, ou `null`.
 * Só para aluno que aceitou os lembretes, e no máximo um por dia (`ultimoLembreteEm`).
 */
export function decidirLembrete(perfil: PerfilLembrete, agora = new Date()): Lembrete | null {
  if (perfil.papel !== 'aluno' || !perfil.lembretesEmail) return null;
  if (perfil.ultimoLembreteEm && diasCorridos(perfil.ultimoLembreteEm, agora) <= 0) return null;

  if (!perfil.ultimoEstudoEm) {
    return diasCorridos(perfil.criadoEm, agora) === DIAS_PRIMEIRA_LICAO ? { tipo: 'primeira-licao' } : null;
  }

  const semEstudar = diasCorridos(perfil.ultimoEstudoEm, agora);
  if (semEstudar === 1) {
    return perfil.ofensivaAtual >= OFENSIVA_MINIMA_LEMBRETE ? { tipo: 'ofensiva', dias: perfil.ofensivaAtual } : null;
  }
  if ((DIAS_SAUDADE as readonly number[]).includes(semEstudar)) return { tipo: 'saudade', dias: semEstudar };
  return null;
}
