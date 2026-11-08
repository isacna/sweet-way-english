// Turmas: criação, listagem, detalhe e entrada por código de convite.
import { prisma } from '../database/client.js';
import { arquivoResumoSelect } from '../http/arquivoPublico.js';
import { ehErroPrisma, ErroNaoEncontrado, ErroProibido, ErroValidacao } from './erros.js';
import type { UsuarioSessao } from './tipos.js';

const incluirArquivo = { arquivo: { select: arquivoResumoSelect } } as const;

/**
 * Professora dona da turma ou aluno matriculado; os demais recebem 403. Turma inexistente: 404.
 * Devolve a turma (sem relações).
 */
export async function garantirAcessoTurma(usuario: UsuarioSessao, turmaId: number) {
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) throw new ErroNaoEncontrado('Turma não encontrada');
  await conferirAcesso(usuario, turma);
  return turma;
}

async function conferirAcesso(usuario: UsuarioSessao, turma: { id: number; professorId: number }) {
  if (usuario.role === 'professor') {
    if (turma.professorId !== usuario.id) throw new ErroProibido();
    return;
  }
  const matricula = await prisma.matricula.findFirst({ where: { turmaId: turma.id, alunoId: usuario.id } });
  if (!matricula) throw new ErroProibido();
}

/** Turma da professora; 404 se não existe e 403 se é de outra professora. */
export async function turmaDaProfessora(professorId: number, turmaId: number) {
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) throw new ErroNaoEncontrado('Turma não encontrada');
  if (turma.professorId !== professorId) throw new ErroProibido();
  return turma;
}

export interface NovaTurma {
  nome: string;
  descricao?: string;
  nivel?: string;
}

/** Tentativas de achar um código de convite livre (turmas apagadas deixam buracos na contagem). */
const TENTATIVAS_CODIGO = 10;

export async function criarTurma(professorId: number, dados: NovaTurma) {
  const ano = new Date().getFullYear();
  const total = await prisma.turma.count();
  for (let t = 0; t < TENTATIVAS_CODIGO; t++) {
    const codigoConvite = `SW${dados.nivel || 'B'}${total + 1 + t}-${ano}`;
    try {
      return await prisma.turma.create({
        data: { nome: dados.nome, descricao: dados.descricao, codigoConvite, professorId },
      });
    } catch (err) {
      // Código já usado: tenta o próximo número
      if (!ehErroPrisma(err, 'P2002')) throw err;
    }
  }
  throw new ErroValidacao('Erro ao criar turma');
}

export async function listarTurmas(usuario: UsuarioSessao) {
  if (usuario.role === 'professor') {
    return prisma.turma.findMany({
      where: { professorId: usuario.id },
      include: { _count: { select: { matriculas: true } } },
    });
  }
  const matriculas = await prisma.matricula.findMany({
    where: { alunoId: usuario.id },
    include: { turma: { include: { professor: { select: { nome: true } } } } },
  });
  return matriculas.map((m) => m.turma);
}

/** Turma com atividades, materiais e alunos matriculados. */
export async function detalharTurma(usuario: UsuarioSessao, id: number) {
  const turma = await prisma.turma.findUnique({
    where: { id },
    include: {
      professor: { select: { nome: true } },
      atividades: { include: incluirArquivo },
      materiais: { include: incluirArquivo },
      matriculas: { include: { aluno: { select: { id: true, nome: true, email: true } } } },
    },
  });
  if (!turma) throw new ErroNaoEncontrado('Turma não encontrada');
  await conferirAcesso(usuario, turma);
  return turma;
}

/** O aluno entra numa turma pelo código. Cada aluno fica em uma turma só. */
export async function entrarNaTurma(alunoId: number, codigoConvite: string) {
  const jaMatriculado = await prisma.matricula.findFirst({ where: { alunoId } });
  if (jaMatriculado) throw new ErroValidacao('Você já está em uma turma. Não é possível entrar em outra.');

  const turma = await prisma.turma.findUnique({ where: { codigoConvite } });
  if (!turma) throw new ErroNaoEncontrado('Turma não encontrada');

  try {
    await prisma.matricula.create({ data: { alunoId, turmaId: turma.id } });
  } catch (err) {
    if (ehErroPrisma(err, 'P2002')) throw new ErroValidacao('Você já está nesta turma');
    throw err;
  }
}
