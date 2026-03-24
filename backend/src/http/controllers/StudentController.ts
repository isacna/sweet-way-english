import { Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';

export async function listStudents(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const matriculas = await prisma.matricula.findMany({
    where: { turma: { professorId: req.user.id } },
    include: {
      aluno: { select: { id: true, nome: true, email: true, criadoEm: true } },
      turma: { select: { id: true, nome: true } },
    },
    orderBy: { dataMatricula: 'desc' },
  });

  const byStudent = new Map<
    number,
    { id: number; nome: string; email: string; criadoEm: Date; turmas: Map<number, { id: number; nome: string }> }
  >();

  for (const m of matriculas) {
    const a = m.aluno;
    let row = byStudent.get(a.id);
    if (!row) {
      row = { id: a.id, nome: a.nome, email: a.email, criadoEm: a.criadoEm, turmas: new Map() };
      byStudent.set(a.id, row);
    }
    row.turmas.set(m.turma.id, { id: m.turma.id, nome: m.turma.nome });
  }

  const list = Array.from(byStudent.values())
    .map((r) => ({ id: r.id, nome: r.nome, email: r.email, criadoEm: r.criadoEm, turmas: Array.from(r.turmas.values()) }))
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));

  res.json(list);
}

export async function createStudent(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { nome, email, senha, turmaId } = req.body;
  if (!nome || !email || !senha) {
    res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    return;
  }

  const tid = parseInt(String(turmaId), 10);
  if (Number.isNaN(tid)) {
    res.status(400).json({ error: 'Selecione uma turma para vincular o aluno' });
    return;
  }

  const turma = await prisma.turma.findFirst({ where: { id: tid, professorId: req.user.id } });
  if (!turma) {
    res.status(400).json({ error: 'Turma inválida' });
    return;
  }

  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    const aluno = await prisma.$transaction(async (tx) => {
      const a = await tx.aluno.create({ data: { nome, email, senha: hashedSenha } });
      await tx.matricula.create({ data: { alunoId: a.id, turmaId: tid } });
      return a;
    });
    res.status(201).json({ message: 'Aluno criado com sucesso', aluno: { id: aluno.id, nome: aluno.nome, email: aluno.email } });
  } catch {
    res.status(400).json({ error: 'Email já cadastrado ou aluno já está nesta turma' });
  }
}

export async function updateStudent(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const alunoId = parseInt(req.params.id);
  if (Number.isNaN(alunoId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const linked = await prisma.matricula.findFirst({ where: { alunoId, turma: { professorId: req.user.id } } });
  if (!linked) {
    res.status(404).json({ error: 'Aluno não encontrado' });
    return;
  }

  const { nome, email, senha } = req.body;
  const data: { nome?: string; email?: string; senha?: string } = {};
  if (nome !== undefined) data.nome = nome;
  if (email !== undefined) data.email = email;
  if (senha !== undefined && senha !== '') data.senha = await bcrypt.hash(senha, 10);

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Envie ao menos um campo: nome, email ou senha' });
    return;
  }

  try {
    const aluno = await prisma.aluno.update({
      where: { id: alunoId },
      data,
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    res.json(aluno);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

export async function deleteStudent(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const alunoId = parseInt(req.params.id);
  if (Number.isNaN(alunoId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const linked = await prisma.matricula.findFirst({ where: { alunoId, turma: { professorId: req.user.id } } });
  if (!linked) {
    res.status(404).json({ error: 'Aluno não encontrado' });
    return;
  }

  const submissions = await prisma.submissao.findMany({ where: { alunoId }, select: { arquivoUrl: true } });

  await prisma.$transaction(async (tx) => {
    await tx.feedback.deleteMany({ where: { submissao: { alunoId } } });
    await tx.submissao.deleteMany({ where: { alunoId } });
    await tx.matricula.deleteMany({ where: { alunoId } });
    await tx.aluno.delete({ where: { id: alunoId } });
  });

  for (const s of submissions) {
    if (s.arquivoUrl?.startsWith('/uploads/')) {
      const filePath = path.join('uploads', path.basename(s.arquivoUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  res.status(204).send();
}
