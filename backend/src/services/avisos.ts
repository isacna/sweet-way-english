// Avisos (mural) das turmas.
import { prisma } from '../database/client.js';
import { ErroNaoEncontrado, ErroProibido } from './erros.js';
import type { UsuarioSessao } from './tipos.js';

/** Professora dona ou aluno matriculado. Turma inexistente também é 403 (não revela se existe). */
export async function listarAvisos(usuario: UsuarioSessao, turmaId: number) {
  if (usuario.role === 'professor') {
    const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId: usuario.id } });
    if (!turma) throw new ErroProibido();
  } else {
    const matricula = await prisma.matricula.findFirst({ where: { turmaId, alunoId: usuario.id } });
    if (!matricula) throw new ErroProibido();
  }
  return prisma.aviso.findMany({ where: { turmaId }, orderBy: { criadoEm: 'desc' } });
}

export interface NovoAviso {
  titulo: string;
  conteudo: string | null;
  link: string | null;
}

export async function criarAviso(professorId: number, turmaId: number, dados: NovoAviso) {
  const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId } });
  if (!turma) throw new ErroProibido('Turma não encontrada');
  return prisma.aviso.create({ data: { ...dados, turmaId } });
}

export async function apagarAviso(professorId: number, turmaId: number, avisoId: number) {
  const aviso = await prisma.aviso.findFirst({ where: { id: avisoId, turmaId, turma: { professorId } } });
  if (!aviso) throw new ErroNaoEncontrado('Aviso não encontrado');
  await prisma.aviso.delete({ where: { id: avisoId } });
}
