import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../database/client.js';
import type { AuthRequest, Papel } from '../../types/index.js';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  jwt.verify(token, env.JWT_SECRET, (err: unknown, user: unknown) => {
    // Tokens antigos (antes da expiração ser obrigatória) não têm `exp`
    if (err || typeof (user as { exp?: unknown })?.exp !== 'number') {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }
    (req as Request & { user: unknown }).user = user;
    next();
  });
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
