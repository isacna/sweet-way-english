import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../database/client.js';
import { env } from '../../config/env.js';

import { IDADE_MAIORIDADE, idadeEm } from '../../domain/idade.js';
import { normalizarEmail } from '../../domain/email.js';

const registerSchema = z
  .object({
    nome: z.string().trim().min(1, 'Nome é obrigatório'),
    email: z.string().trim().toLowerCase().pipe(z.email('Email inválido')),
    senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
    dataNascimento: z.coerce.date({ error: 'Data de nascimento inválida' }),
    responsavelNome: z.string().trim().optional(),
    responsavelEmail: z.string().trim().toLowerCase().pipe(z.email('Email do responsável inválido')).optional(),
    consentimentoResponsavel: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.dataNascimento > new Date()) {
      ctx.addIssue({ code: 'custom', path: ['dataNascimento'], message: 'Data de nascimento no futuro' });
      return;
    }
    // LGPD art. 14: menor de idade precisa de consentimento de um responsável
    if (idadeEm(d.dataNascimento) < IDADE_MAIORIDADE) {
      if (!d.responsavelNome || !d.responsavelEmail || d.consentimentoResponsavel !== true) {
        ctx.addIssue({
          code: 'custom',
          path: ['consentimentoResponsavel'],
          message: 'Menores de 18 anos precisam do nome, email e consentimento de um responsável',
        });
      }
    }
  });

const loginSchema = z.object({
  email: z.string().trim().min(1),
  senha: z.string().min(1),
});

/** Cadastro público: sempre cria aluno. Professores são criados pelo admin. */
export async function registerStudent(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const d = parsed.data;
  const menor = idadeEm(d.dataNascimento) < IDADE_MAIORIDADE;

  try {
    const hashedSenha = await bcrypt.hash(d.senha, 10);
    await prisma.usuario.create({
      data: {
        nome: d.nome,
        email: d.email,
        senha: hashedSenha,
        papel: 'aluno',
        dataNascimento: d.dataNascimento,
        ...(menor && {
          responsavelNome: d.responsavelNome,
          responsavelEmail: d.responsavelEmail,
          consentimentoResponsavelEm: new Date(),
        }),
      },
    });
    res.status(201).json({ message: 'Aluno criado com sucesso' });
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Email e senha são obrigatórios' });
    return;
  }
  const { email, senha } = parsed.data;

  // E-mails são gravados normalizados (minúsculos), então uma busca basta
  const user = await prisma.usuario.findUnique({ where: { email: normalizarEmail(email) } });

  if (!user || !(await bcrypt.compare(senha, user.senha))) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const role = user.papel;
  const token = jwt.sign({ id: user.id, email: user.email, role, admin: user.admin }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role, admin: user.admin } });
}
