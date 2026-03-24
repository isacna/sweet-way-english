import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { StatusSubmissao } from '../../database/generated/prisma/client.js';
import { AuthRequest } from '../../types/index.js';

export async function createSubmission(req: AuthRequest, res: Response) {
  if (req.user.role !== 'aluno') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const atividadeId = parseInt(req.params.id, 10);
  if (Number.isNaN(atividadeId)) {
    res.status(400).json({ error: 'Atividade inválida' });
    return;
  }

  const atividade = await prisma.atividade.findUnique({ where: { id: atividadeId } });
  if (!atividade) {
    res.status(404).json({ error: 'Atividade não encontrada' });
    return;
  }

  const enrolled = await prisma.matricula.findFirst({ where: { turmaId: atividade.turmaId, alunoId: req.user.id } });
  if (!enrolled) {
    res.status(403).json({ error: 'Você não está nesta turma' });
    return;
  }

  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (atividade.arquivoObrigatorio && !file) {
    res.status(400).json({ error: 'Esta atividade exige o envio de um arquivo.' });
    return;
  }

  const last = await prisma.submissao.findFirst({
    where: { atividadeId, alunoId: req.user.id },
    orderBy: { dataEnvio: 'desc' },
  });
  if (last && last.status !== StatusSubmissao.reprovado) {
    res.status(400).json({
      error: 'Você já possui uma entrega para esta atividade. Só é possível enviar de novo se o professor reprovar a última entrega (status reprovado). Com entrega aprovada ou corrigida, não há nova submissão.',
    });
    return;
  }

  const { conteudo } = req.body;
  const submissao = await prisma.submissao.create({
    data: {
      atividadeId,
      alunoId: req.user.id,
      conteudo,
      arquivoUrl: file ? `/uploads/${file.filename}` : null,
    },
  });
  res.status(201).json(submissao);
}

export async function listSubmissionsByActivity(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const atividadeId = parseInt(req.params.id, 10);
  if (Number.isNaN(atividadeId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const atividade = await prisma.atividade.findUnique({
    where: { id: atividadeId },
    include: { turma: { select: { professorId: true } } },
  });
  if (!atividade) {
    res.status(404).json({ error: 'Atividade não encontrada' });
    return;
  }
  if (atividade.turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const submissoes = await prisma.submissao.findMany({
    where: { atividadeId },
    include: { aluno: { select: { id: true, nome: true } }, feedback: true },
    orderBy: { dataEnvio: 'desc' },
  });
  res.json(submissoes);
}

export async function updateSubmissionStatus(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const { status } = req.body;
  if (status !== 'aprovado' && status !== 'reprovado') {
    res.status(400).json({ error: 'Envie status: "aprovado" ou "reprovado"' });
    return;
  }

  const submissao = await prisma.submissao.findUnique({
    where: { id },
    include: { atividade: { include: { turma: { select: { professorId: true } } } } },
  });
  if (!submissao) {
    res.status(404).json({ error: 'Submissão não encontrada' });
    return;
  }
  if (submissao.atividade.turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  if (submissao.status === StatusSubmissao.aprovado || submissao.status === StatusSubmissao.reprovado) {
    res.status(400).json({ error: 'Esta entrega já foi avaliada com Aprovar ou Reprovar e não pode ser alterada.' });
    return;
  }

  const newStatus = status === 'aprovado' ? StatusSubmissao.aprovado : StatusSubmissao.reprovado;

  if (submissao.status === StatusSubmissao.corrigido && newStatus === StatusSubmissao.aprovado) {
    res.status(400).json({ error: 'Uma entrega já corrigida com nota só pode ser reprovada para o aluno tentar de novo.' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (newStatus === StatusSubmissao.reprovado) {
      await tx.feedback.deleteMany({ where: { submissaoId: id } });
    }
    return tx.submissao.update({
      where: { id },
      data: { status: newStatus },
      include: { aluno: { select: { id: true, nome: true } }, feedback: true },
    });
  });
  res.json(updated);
}
