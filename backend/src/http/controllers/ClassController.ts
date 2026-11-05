import { Response } from 'express';
import { randomInt } from 'crypto';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';
import { idParam } from './cursoApoio.js';

// Sem 0/O/1/I/L para o código ser fácil de digitar
const ALFABETO_CONVITE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Código de convite aleatório (31^8 ≈ 8,5e11): não dá para adivinhar o de outra turma. */
function gerarCodigoConvite() {
  let codigo = '';
  for (let i = 0; i < 8; i++) codigo += ALFABETO_CONVITE[randomInt(ALFABETO_CONVITE.length)];
  return codigo;
}

export async function createClass(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { nome, descricao } = req.body;
  if (typeof nome !== 'string' || !nome.trim() || (descricao != null && typeof descricao !== 'string')) {
    res.status(400).json({ error: 'Nome da turma é obrigatório' });
    return;
  }

  // Colisão é improvável, mas o código é @unique: tenta de novo em vez de falhar
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const turma = await prisma.turma.create({
        data: { nome: nome.trim(), descricao, codigoConvite: gerarCodigoConvite(), professorId: req.user.id },
      });
      res.status(201).json(turma);
      return;
    } catch {
      // tenta outro código
    }
  }
  res.status(400).json({ error: 'Erro ao criar turma' });
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
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const ehProfessor = req.user.role === 'professor';
  const turma = await prisma.turma.findUnique({
    where: { id },
    include: {
      professor: { select: { nome: true } },
      atividades: true,
      materiais: true,
      // Alunos veem só o nome dos colegas (podem ser menores): email fica com a professora
      matriculas: { include: { aluno: { select: { id: true, nome: true, email: ehProfessor } } } },
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
  if (typeof codigoConvite !== 'string' || !codigoConvite.trim()) {
    res.status(400).json({ error: 'Informe o código de convite' });
    return;
  }

  const alreadyEnrolled = await prisma.matricula.findFirst({
    where: { alunoId: req.user.id },
  });
  if (alreadyEnrolled) {
    res.status(400).json({ error: 'Você já está em uma turma. Não é possível entrar em outra.' });
    return;
  }

  const turma = await prisma.turma.findUnique({ where: { codigoConvite: codigoConvite.trim() } });
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
