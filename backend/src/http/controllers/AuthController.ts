import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sweet-way-secret-key';

export async function registerProfessor(req: Request, res: Response) {
  const { nome, email, senha } = req.body;
  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    await prisma.professor.create({ data: { nome, email, senha: hashedSenha } });
    res.status(201).json({ message: 'Professor criado com sucesso' });
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

export async function registerStudent(req: Request, res: Response) {
  const { nome, email, senha } = req.body;
  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    await prisma.aluno.create({ data: { nome, email, senha: hashedSenha } });
    res.status(201).json({ message: 'Aluno criado com sucesso' });
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, senha } = req.body;

  let user: { id: number; nome: string; email: string; senha: string } | null =
    await prisma.professor.findUnique({ where: { email } });
  let role = 'professor';

  if (!user) {
    user = await prisma.aluno.findUnique({ where: { email } });
    role = 'aluno';
  }

  if (!user || !(await bcrypt.compare(senha, user.senha))) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role } });
}
