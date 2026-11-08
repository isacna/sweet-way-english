// Nota e comentário da professora numa entrega.
import { prisma } from '../database/client.js';
import { StatusSubmissao } from '../database/generated/prisma/client.js';
import { ErroValidacao } from './erros.js';
import { submissaoDaProfessora } from './submissoes.js';

export interface NovoFeedback {
  comentario: string;
  nota: number;
}

/** Uma nota por entrega; marca a entrega como `corrigido`. Não vale depois de Aprovar/Reprovar. */
export async function criarFeedback(professorId: number, submissaoId: number, dados: NovoFeedback) {
  const submissao = await submissaoDaProfessora(professorId, submissaoId);
  if (submissao.feedback) throw new ErroValidacao('Esta submissão já possui feedback.');
  if (submissao.status === StatusSubmissao.aprovado || submissao.status === StatusSubmissao.reprovado) {
    throw new ErroValidacao('Não é possível enviar nota após Aprovar ou Reprovar nesta entrega.');
  }

  return prisma.$transaction(async (tx) => {
    const feedback = await tx.feedback.create({ data: { submissaoId, professorId, ...dados } });
    await tx.submissao.update({ where: { id: submissaoId }, data: { status: StatusSubmissao.corrigido } });
    return feedback;
  });
}

/** Feedbacks recebidos pelo aluno, com a entrega e a atividade. */
export async function feedbacksDoAluno(alunoId: number) {
  return prisma.feedback.findMany({
    where: { submissao: { alunoId } },
    include: {
      submissao: { include: { atividade: true } },
      professor: { select: { nome: true } },
    },
  });
}
