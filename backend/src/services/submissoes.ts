// Entregas dos alunos e a avaliação (aprovar/reprovar) da professora.
import { prisma } from '../database/client.js';
import { StatusSubmissao } from '../database/generated/prisma/client.js';
import { arquivoResumoSelect } from '../http/arquivoPublico.js';
import { ErroNaoEncontrado, ErroProibido, ErroValidacao } from './erros.js';
import type { GravarAnexo } from './tipos.js';

const incluirArquivo = { arquivo: { select: arquivoResumoSelect } } as const;
const incluirParaProfessora = { aluno: { select: { id: true, nome: true } }, feedback: true, ...incluirArquivo } as const;

/** Nova entrega. Só se reenvia depois de uma reprovação. O arquivo só vai para o disco depois das checagens. */
export async function criarSubmissao(
  alunoId: number,
  atividadeId: number,
  conteudo: string | undefined,
  anexo: GravarAnexo | null,
) {
  const atividade = await prisma.atividade.findUnique({ where: { id: atividadeId } });
  if (!atividade) throw new ErroNaoEncontrado('Atividade não encontrada');

  const matricula = await prisma.matricula.findFirst({ where: { turmaId: atividade.turmaId, alunoId } });
  if (!matricula) throw new ErroProibido('Você não está nesta turma');

  if (atividade.arquivoObrigatorio && !anexo) throw new ErroValidacao('Esta atividade exige o envio de um arquivo.');

  const ultima = await prisma.submissao.findFirst({
    where: { atividadeId, alunoId },
    orderBy: { dataEnvio: 'desc' },
  });
  if (ultima && ultima.status !== StatusSubmissao.reprovado) {
    throw new ErroValidacao(
      'Você já possui uma entrega para esta atividade. Só é possível enviar de novo se o professor reprovar a última entrega (status reprovado). Com entrega aprovada ou corrigida, não há nova submissão.',
    );
  }

  const dados = { atividadeId, alunoId, conteudo };
  return anexo
    ? anexo((tx, a) => tx.submissao.create({ data: { ...dados, arquivoId: a.id }, include: incluirArquivo }))
    : prisma.submissao.create({ data: dados, include: incluirArquivo });
}

export async function listarSubmissoes(professorId: number, atividadeId: number) {
  const atividade = await prisma.atividade.findUnique({
    where: { id: atividadeId },
    include: { turma: { select: { professorId: true } } },
  });
  if (!atividade) throw new ErroNaoEncontrado('Atividade não encontrada');
  if (atividade.turma.professorId !== professorId) throw new ErroProibido();

  return prisma.submissao.findMany({
    where: { atividadeId },
    include: incluirParaProfessora,
    orderBy: { dataEnvio: 'desc' },
  });
}

/** Entrega com a turma, para conferir se é da professora. 404/403. */
export async function submissaoDaProfessora(professorId: number, id: number) {
  const submissao = await prisma.submissao.findUnique({
    where: { id },
    include: {
      atividade: { include: { turma: { select: { professorId: true } } } },
      feedback: true,
    },
  });
  if (!submissao) throw new ErroNaoEncontrado('Submissão não encontrada');
  if (submissao.atividade.turma.professorId !== professorId) throw new ErroProibido();
  return submissao;
}

/**
 * Aprovar ou reprovar. Uma entrega já aprovada/reprovada não muda; uma corrigida (com nota) só pode ser reprovada,
 * e reprovar apaga o feedback (o aluno envia de novo).
 */
export async function avaliarSubmissao(professorId: number, id: number, status: 'aprovado' | 'reprovado') {
  const submissao = await submissaoDaProfessora(professorId, id);

  if (submissao.status === StatusSubmissao.aprovado || submissao.status === StatusSubmissao.reprovado) {
    throw new ErroValidacao('Esta entrega já foi avaliada com Aprovar ou Reprovar e não pode ser alterada.');
  }
  if (submissao.status === StatusSubmissao.corrigido && status === StatusSubmissao.aprovado) {
    throw new ErroValidacao('Uma entrega já corrigida com nota só pode ser reprovada para o aluno tentar de novo.');
  }

  return prisma.$transaction(async (tx) => {
    if (status === StatusSubmissao.reprovado) {
      await tx.feedback.deleteMany({ where: { submissaoId: id } });
    }
    return tx.submissao.update({ where: { id }, data: { status }, include: incluirParaProfessora });
  });
}
