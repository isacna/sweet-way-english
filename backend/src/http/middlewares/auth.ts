import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../database/client.js';
import type { AuthRequest, Papel } from '../../types/index.js';
import { COOKIE_SESSAO } from '../sessao.js';

/**
 * Um `Authorization: Bearer` explícito vence o cookie: o header é escolhido a cada requisição, o cookie é ambiente
 * (um cliente de API com cookie jar que logou como outro usuário continua usando o token que mandou).
 * O frontend não manda Bearer, então no navegador vale o cookie.
 */
function extrairToken(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim() || undefined;
  return (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_SESSAO] || undefined;
}

interface PayloadToken {
  id: number;
  email: string;
  role: Papel;
  admin?: boolean;
  v: number;
  exp: number;
}

/**
 * Lê o JWT do cookie `sw_sessao` (navegador) ou do header `Authorization: Bearer` (clientes de API, testes).
 * Confere no banco se o usuário ainda existe e se `versaoToken` bate com o `v` do token: trocar a senha
 * incrementa a versão e derruba as sessões antigas.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = extrairToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  let payload: PayloadToken;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as PayloadToken;
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
  // Tokens antigos não têm `exp` (antes da expiração ser obrigatória) nem `v` (antes do versaoToken)
  if (typeof payload?.exp !== 'number' || typeof payload.v !== 'number' || typeof payload.id !== 'number') {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id }, select: { versaoToken: true } });
    if (!usuario || usuario.versaoToken !== payload.v) {
      res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
      return;
    }
  } catch (err) {
    next(err);
    return;
  }

  (req as AuthRequest).user = { id: payload.id, email: payload.email, role: payload.role, admin: payload.admin };
  next();
}

/** Use depois de `authenticateToken`. */
export function requireRole(...papeis: Papel[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthRequest;
    if (!user || !papeis.includes(user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
    next();
  };
}

/**
 * Use depois de `authenticateToken`. Consulta o banco em vez de confiar no token,
 * para que remover o privilégio de admin tenha efeito imediato.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const { user } = req as AuthRequest;
  const usuario = user
    ? await prisma.usuario.findUnique({ where: { id: user.id }, select: { admin: true } })
    : null;
  if (!usuario?.admin) {
    res.status(403).json({ error: 'Acesso restrito ao administrador' });
    return;
  }
  next();
}
