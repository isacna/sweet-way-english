import { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../database/client.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

import { IDADE_MAIORIDADE, idadeEm } from '../../domain/idade.js';
import { normalizarEmail } from '../../domain/email.js';
import { enviarEmail } from '../../email/index.js';
import { emailRedefinirSenha } from '../../email/templates.js';
import { encerrarSessao, iniciarSessao, usuarioPublico } from '../sessao.js';
import type { AuthRequest } from '../../types/index.js';

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

  const token = iniciarSessao(res, user);
  // O navegador usa o cookie; `token` continua no corpo para clientes de API (Bearer)
  res.json({ token, user: usuarioPublico(user) });
}

/** Apaga o cookie de sessão. Não exige estar logado (sessão já expirada também sai limpa). */
export async function logout(_req: Request, res: Response) {
  encerrarSessao(res);
  res.json({ message: 'Sessão encerrada' });
}

/** Usuário da sessão atual (o frontend valida a sessão ao carregar). Use depois de `authenticateToken`. */
export async function me(req: Request, res: Response) {
  const { user } = req as AuthRequest;
  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { id: true, nome: true, email: true, papel: true, admin: true, versaoToken: true },
  });
  if (!usuario) {
    encerrarSessao(res);
    res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
    return;
  }
  res.json({ user: usuarioPublico(usuario) });
}

// ─── Recuperar senha ────────────────────────────────────────────────────────

export const MSG_ESQUECI_SENHA = 'Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha.';
const VALIDADE_TOKEN_SENHA_MS = 60 * 60 * 1000;

const esqueciSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido')),
});

const redefinirSchema = z.object({
  token: z.string().trim().min(1, 'Link inválido ou expirado'),
  senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
});

export function hashTokenSenha(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Sempre responde a mesma coisa, exista ou não a conta (não revela quais e-mails estão cadastrados).
 * Para menores, o link vai para o e-mail da própria conta, como para qualquer usuário.
 */
export async function esqueciSenha(req: Request, res: Response) {
  const parsed = esqueciSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: normalizarEmail(parsed.data.email) },
    select: { id: true, nome: true, email: true },
  });

  if (usuario) {
    const token = randomBytes(32).toString('hex');
    await prisma.$transaction([
      // Só o link mais recente vale
      prisma.tokenSenha.deleteMany({ where: { usuarioId: usuario.id, usadoEm: null } }),
      prisma.tokenSenha.create({
        data: {
          usuarioId: usuario.id,
          hashToken: hashTokenSenha(token),
          expiraEm: new Date(Date.now() + VALIDADE_TOKEN_SENHA_MS),
        },
      }),
    ]);

    const link = `${env.frontendUrl}/redefinir-senha?token=${token}`;
    const { assunto, html, texto } = emailRedefinirSenha({ nome: usuario.nome, link });
    // Sem await: o tempo de resposta não deve depender do envio (nem revelar que a conta existe)
    enviarEmail({ para: usuario.email, assunto, html, texto }).catch((err) => {
      (req.log ?? logger).error({ err }, 'Falha ao enviar o e-mail de redefinição de senha');
    });
  }

  res.json({ message: MSG_ESQUECI_SENHA });
}

export async function redefinirSenha(req: Request, res: Response) {
  const parsed = redefinirSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { token, senha } = parsed.data;
  const ERRO_LINK = 'Link inválido ou expirado. Peça um novo em "Esqueci minha senha".';

  const registro = await prisma.tokenSenha.findUnique({ where: { hashToken: hashTokenSenha(token) } });
  if (!registro || registro.usadoEm || registro.expiraEm.getTime() <= Date.now()) {
    res.status(400).json({ error: ERRO_LINK });
    return;
  }

  const hash = await bcrypt.hash(senha, 10);
  const ok = await prisma.$transaction(async (tx) => {
    // Marca como usado só se ainda não foi (duas requisições ao mesmo tempo: só uma passa)
    const marcado = await tx.tokenSenha.updateMany({
      where: { id: registro.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    if (marcado.count !== 1) return false;
    await tx.usuario.update({
      where: { id: registro.usuarioId },
      // Nova versão: todas as sessões abertas com a senha antiga deixam de valer
      data: { senha: hash, versaoToken: { increment: 1 } },
    });
    await tx.tokenSenha.deleteMany({ where: { usuarioId: registro.usuarioId, usadoEm: null } });
    return true;
  });

  if (!ok) {
    res.status(400).json({ error: ERRO_LINK });
    return;
  }
  encerrarSessao(res);
  res.json({ message: 'Senha alterada. Entre com a nova senha.' });
}
