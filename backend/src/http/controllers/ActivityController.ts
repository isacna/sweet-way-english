import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';

export async function createActivity(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const turmaId = parseInt(req.params.turmaId, 10);
  if (Number.isNaN(turmaId)) {
    res.status(400).json({ error: 'Turma inválida' });
    return;
  }

  const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId: req.user.id } });
  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }

  const { titulo, descricao, dataEntrega, arquivoObrigatorio } = req.body;
  const atividade = await prisma.atividade.create({
    data: {
      titulo,
      descricao,
      dataEntrega: new Date(dataEntrega),
      arquivoObrigatorio: Boolean(arquivoObrigatorio),
      turmaId,
    },
  });
  res.status(201).json(atividade);
}

export async function updateActivity(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const existing = await prisma.atividade.findUnique({
    where: { id },
    include: { turma: { select: { professorId: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Atividade não encontrada' });
    return;
  }
  if (existing.turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { titulo, descricao, dataEntrega, arquivoObrigatorio } = req.body;
  const data: { titulo?: string; descricao?: string; dataEntrega?: Date; arquivoObrigatorio?: boolean } = {};

  if (titulo !== undefined) {
    const t = String(titulo).trim();
    if (!t) { res.status(400).json({ error: 'Título não pode ser vazio' }); return; }
    data.titulo = t;
  }
  if (descricao !== undefined) {
    const d = String(descricao).trim();
    if (!d) { res.status(400).json({ error: 'Descrição não pode ser vazia' }); return; }
    data.descricao = d;
  }
  if (dataEntrega !== undefined) {
    const d = new Date(dataEntrega);
    if (Number.isNaN(d.getTime())) { res.status(400).json({ error: 'Data de entrega inválida' }); return; }
    data.dataEntrega = d;
  }
  if (arquivoObrigatorio !== undefined) data.arquivoObrigatorio = Boolean(arquivoObrigatorio);

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Envie titulo, descricao, dataEntrega e/ou arquivoObrigatorio' });
    return;
  }

  const atividade = await prisma.atividade.update({ where: { id }, data });
  res.json(atividade);
}

export async function listActivitiesByClass(req: AuthRequest, res: Response) {
  const turmaId = parseInt(req.params.turmaId);
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }

  if (req.user.role === 'professor' && turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }
  if (req.user.role === 'aluno') {
    const enrolled = await prisma.matricula.findFirst({ where: { turmaId, alunoId: req.user.id } });
    if (!enrolled) { res.status(403).json({ error: 'Acesso negado' }); return; }
  }

  const submissoesInclude =
    req.user.role === 'aluno'
      ? {
          where: { alunoId: req.user.id },
          include: { aluno: { select: { nome: true } }, feedback: { include: { professor: { select: { nome: true } } } } },
          orderBy: { dataEnvio: 'desc' as const },
        }
      : {
          include: { aluno: { select: { nome: true } } },
          orderBy: { dataEnvio: 'desc' as const },
        };

  const atividades = await prisma.atividade.findMany({
    where: { turmaId },
    include: { submissoes: submissoesInclude },
  });
  res.json(atividades);
}
