import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { StatusSubmissao } from '../../database/generated/prisma/client.js';
import { AuthRequest } from '../../types/index.js';

export async function createFeedback(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const submissaoId = parseInt(req.params.id, 10);
  if (Number.isNaN(submissaoId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const submissao = await prisma.submissao.findUnique({
    where: { id: submissaoId },
    include: {
      atividade: { include: { turma: { select: { professorId: true } } } },
      feedback: true,
    },
  });
  if (!submissao) {
    res.status(404).json({ error: 'Submissão não encontrada' });
    return;
  }
  if (submissao.atividade.turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }
  if (submissao.feedback) {
    res.status(400).json({ error: 'Esta submissão já possui feedback.' });
    return;
  }
  if (submissao.status === StatusSubmissao.aprovado || submissao.status === StatusSubmissao.reprovado) {
    res.status(400).json({ error: 'Não é possível enviar nota após Aprovar ou Reprovar nesta entrega.' });
    return;
  }

  const { comentario, nota } = req.body;
  const feedback = await prisma.feedback.create({
    data: { submissaoId, professorId: req.user.id, comentario, nota: parseFloat(nota) },
  });
  await prisma.submissao.update({ where: { id: submissaoId }, data: { status: StatusSubmissao.corrigido } });
  res.status(201).json(feedback);
}

export async function getMyFeedbacks(req: AuthRequest, res: Response) {
  const feedbacks = await prisma.feedback.findMany({
    where: { submissao: { alunoId: req.user.id } },
    include: {
      submissao: { include: { atividade: true } },
      professor: { select: { nome: true } },
    },
  });
  res.json(feedbacks);
}
