import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';

export async function createClass(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { nome, descricao, nivel } = req.body;
  const year = new Date().getFullYear();
  const count = await prisma.turma.count();
  const codigoConvite = `SW${nivel || 'B'}${count + 1}-${year}`;

  try {
    const turma = await prisma.turma.create({
      data: { nome, descricao, codigoConvite, professorId: req.user.id },
    });
    res.status(201).json(turma);
  } catch {
    res.status(400).json({ error: 'Erro ao criar turma' });
  }
}

export async function listClasses(req: AuthRequest, res: Response) {
  if (req.user.role === 'professor') {
    const turmas = await prisma.turma.findMany({
      where: { professorId: req.user.id },
      include: { _count: { select: { matriculas: true } } },
    });
    res.json(turmas);
    return;
  }

  const matriculas = await prisma.matricula.findMany({
    where: { alunoId: req.user.id },
    include: { turma: { include: { professor: { select: { nome: true } } } } },
  });
  res.json(matriculas.map((m) => m.turma));
}

export async function getClassById(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const turma = await prisma.turma.findUnique({
    where: { id },
    include: {
      professor: { select: { nome: true } },
      atividades: true,
      materiais: true,
      matriculas: { include: { aluno: { select: { id: true, nome: true, email: true } } } },
    },
  });

  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }
  if (req.user.role === 'professor' && turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }
  if (req.user.role === 'aluno') {
    const enrolled = await prisma.matricula.findFirst({
      where: { turmaId: id, alunoId: req.user.id },
    });
    if (!enrolled) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
  }

  res.json(turma);
}

export async function joinClass(req: AuthRequest, res: Response) {
  if (req.user.role !== 'aluno') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { codigoConvite } = req.body;

  const alreadyEnrolled = await prisma.matricula.findFirst({
    where: { alunoId: req.user.id },
  });
  if (alreadyEnrolled) {
    res.status(400).json({ error: 'Você já está em uma turma. Não é possível entrar em outra.' });
    return;
  }

  const turma = await prisma.turma.findUnique({ where: { codigoConvite } });
  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }

  try {
    await prisma.matricula.create({ data: { alunoId: req.user.id, turmaId: turma.id } });
    res.json({ message: 'Matriculado com sucesso' });
  } catch {
    res.status(400).json({ error: 'Você já está nesta turma' });
  }
}
