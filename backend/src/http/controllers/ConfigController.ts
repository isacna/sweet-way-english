import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getOrCreateConfig() {
  return prisma.configuracaoApp.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

// ─── Configuração da aplicação ──────────────────────────────────────────────

export async function getConfig(_req: Request, res: Response) {
  const config = await getOrCreateConfig();
  const base = process.env.APP_URL ?? 'http://localhost:3333';
  const logoUrl = config.logoUrl
    ? `${base}${config.logoUrl}`
    : null;
  res.json({ logoUrl });
}

export async function uploadLogo(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado' });
    return;
  }

  const newLogoUrl = `/uploads/${req.file.filename}`;

  // Apagar logo anterior se existia
  const config = await getOrCreateConfig();
  if (config.logoUrl?.startsWith('/uploads/')) {
    const oldPath = path.join('uploads', path.basename(config.logoUrl));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await prisma.configuracaoApp.update({
    where: { id: 1 },
    data: { logoUrl: newLogoUrl },
  });

  const base = process.env.APP_URL ?? 'http://localhost:3333';
  res.json({ logoUrl: `${base}${newLogoUrl}` });
}

// ─── Perfil do professor logado ─────────────────────────────────────────────

export async function getProfessorMe(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const professor = await prisma.professor.findUnique({
    where: { id: req.user.id },
    select: { id: true, nome: true, email: true, criadoEm: true },
  });

  if (!professor) {
    res.status(404).json({ error: 'Professor não encontrado' });
    return;
  }

  res.json(professor);
}

export async function updateProfessorMe(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { nome, email, senha } = req.body;
  const data: { nome?: string; email?: string; senha?: string } = {};

  if (nome !== undefined) {
    const n = String(nome).trim();
    if (!n) { res.status(400).json({ error: 'Nome não pode ser vazio' }); return; }
    data.nome = n;
  }
  if (email !== undefined) {
    const e = String(email).trim();
    if (!e) { res.status(400).json({ error: 'Email não pode ser vazio' }); return; }
    data.email = e;
  }
  if (senha !== undefined && String(senha).trim()) {
    data.senha = await bcrypt.hash(String(senha).trim(), 10);
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Envie ao menos um campo: nome, email ou senha' });
    return;
  }

  try {
    const professor = await prisma.professor.update({
      where: { id: req.user.id },
      data,
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    res.json(professor);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

// ─── Gestão de professores (admin) ──────────────────────────────────────────

export async function listAllProfessors(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const professores = await prisma.professor.findMany({
    select: { id: true, nome: true, email: true, criadoEm: true },
    orderBy: { nome: 'asc' },
  });

  res.json(professores);
}

export async function createProfessorAdmin(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    return;
  }

  try {
    const hashedSenha = await bcrypt.hash(String(senha), 10);
    const professor = await prisma.professor.create({
      data: { nome: String(nome).trim(), email: String(email).trim(), senha: hashedSenha },
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    res.status(201).json(professor);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

export async function updateProfessorAdmin(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const targetId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  if (targetId === req.user.id) {
    res.status(400).json({ error: 'Use /professor/me para editar seu próprio perfil' });
    return;
  }

  const { nome, email, senha } = req.body;
  const data: { nome?: string; email?: string; senha?: string } = {};

  if (nome !== undefined) {
    const n = String(nome).trim();
    if (!n) { res.status(400).json({ error: 'Nome não pode ser vazio' }); return; }
    data.nome = n;
  }
  if (email !== undefined) {
    const e = String(email).trim();
    if (!e) { res.status(400).json({ error: 'Email não pode ser vazio' }); return; }
    data.email = e;
  }
  if (senha !== undefined && String(senha).trim()) {
    data.senha = await bcrypt.hash(String(senha).trim(), 10);
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Envie ao menos um campo: nome, email ou senha' });
    return;
  }

  try {
    const professor = await prisma.professor.update({
      where: { id: targetId },
      data,
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    res.json(professor);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado ou professor não encontrado' });
  }
}

export async function deleteProfessorAdmin(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const targetId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  if (targetId === req.user.id) {
    res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    return;
  }

  const professor = await prisma.professor.findUnique({ where: { id: targetId } });
  if (!professor) {
    res.status(404).json({ error: 'Professor não encontrado' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Apagar feedbacks do professor
    await tx.feedback.deleteMany({ where: { professorId: targetId } });
    // Apagar turmas e tudo relacionado
    const turmas = await tx.turma.findMany({ where: { professorId: targetId }, select: { id: true } });
    for (const t of turmas) {
      await tx.feedback.deleteMany({ where: { submissao: { atividade: { turmaId: t.id } } } });
      await tx.submissao.deleteMany({ where: { atividade: { turmaId: t.id } } });
      await tx.atividade.deleteMany({ where: { turmaId: t.id } });
      await tx.materialApoio.deleteMany({ where: { turmaId: t.id } });
      await tx.matricula.deleteMany({ where: { turmaId: t.id } });
    }
    await tx.turma.deleteMany({ where: { professorId: targetId } });
    await tx.professor.delete({ where: { id: targetId } });
  });

  res.status(204).send();
}

// ─── Promoção de aluno para professor ───────────────────────────────────────

export async function promoteAluno(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const alunoId = parseInt(req.params.id, 10);
  if (Number.isNaN(alunoId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
  if (!aluno) {
    res.status(404).json({ error: 'Aluno não encontrado' });
    return;
  }

  const emailJaExiste = await prisma.professor.findUnique({ where: { email: aluno.email } });
  if (emailJaExiste) {
    res.status(400).json({ error: 'Já existe um professor com este email' });
    return;
  }

  const novoProfessor = await prisma.$transaction(async (tx) => {
    const prof = await tx.professor.create({
      data: { nome: aluno.nome, email: aluno.email, senha: aluno.senha },
      select: { id: true, nome: true, email: true },
    });
    await tx.feedback.deleteMany({ where: { submissao: { alunoId } } });
    await tx.submissao.deleteMany({ where: { alunoId } });
    await tx.matricula.deleteMany({ where: { alunoId } });
    await tx.aluno.delete({ where: { id: alunoId } });
    return prof;
  });

  res.status(201).json({ professor: novoProfessor });
}
