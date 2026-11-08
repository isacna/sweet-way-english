import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const prismaMock = vi.hoisted(() => ({
  usuario: { findUnique: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole, requireAdmin } from '../../../http/middlewares/auth.js';

const payloadValido = { id: 1, email: 'a@b.com', role: 'professor', admin: false, v: 2, exp: 9999999999 };

describe('authenticateToken', () => {
  let req: any;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { headers: {}, cookies: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    next = vi.fn();
    (jwt.verify as any).mockReturnValue(payloadValido);
    prismaMock.usuario.findUnique.mockResolvedValue({ versaoToken: 2 });
  });

  it('returns 401 when there is neither cookie nor Authorization header', async () => {
    await authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token is empty', async () => {
    req.headers = { authorization: 'Bearer ' };
    await authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid or expired', async () => {
    req.headers = { authorization: 'Bearer bad.token' };
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('invalid');
    });
    await authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a Bearer token and attaches the user', async () => {
    req.headers = { authorization: 'Bearer valid.token' };
    await authenticateToken(req as Request, res as Response, next);
    expect(jwt.verify).toHaveBeenCalledWith('valid.token', expect.any(String));
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 1, email: 'a@b.com', role: 'professor', admin: false });
  });

  it('accepts the sw_sessao cookie', async () => {
    req.cookies = { sw_sessao: 'cookie.token' };
    await authenticateToken(req as Request, res as Response, next);
    expect(jwt.verify).toHaveBeenCalledWith('cookie.token', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('prefers the cookie over the Authorization header', async () => {
    req.cookies = { sw_sessao: 'cookie.token' };
    req.headers = { authorization: 'Bearer header.token' };
    await authenticateToken(req as Request, res as Response, next);
    expect(jwt.verify).toHaveBeenCalledWith('cookie.token', expect.any(String));
  });

  it('checks versaoToken with a single lookup by id', async () => {
    req.cookies = { sw_sessao: 'cookie.token' };
    await authenticateToken(req as Request, res as Response, next);
    expect(prismaMock.usuario.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: { versaoToken: true } });
  });

  it('returns 401 when versaoToken changed (password changed or reset)', async () => {
    req.cookies = { sw_sessao: 'cookie.token' };
    prismaMock.usuario.findUnique.mockResolvedValue({ versaoToken: 3 });
    await authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the user was deleted', async () => {
    req.cookies = { sw_sessao: 'cookie.token' };
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    await authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token issued before versaoToken (no `v`)', async () => {
    req.headers = { authorization: 'Bearer old.token' };
    const { v: _v, ...semVersao } = payloadValido;
    (jwt.verify as any).mockReturnValue(semVersao);
    await authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 for a token without expiration', async () => {
    req.headers = { authorization: 'Bearer old.token' };
    const { exp: _exp, ...semExp } = payloadValido;
    (jwt.verify as any).mockReturnValue(semExp);
    await authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes database errors to next(err)', async () => {
    req.cookies = { sw_sessao: 'cookie.token' };
    const erro = new Error('db down');
    prismaMock.usuario.findUnique.mockRejectedValue(erro);
    await authenticateToken(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(erro);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    next = vi.fn();
  });

  it('calls next when the role is allowed', () => {
    requireRole('professor')({ user: { id: 1, role: 'professor' } } as any, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when the role is not allowed', () => {
    requireRole('professor')({ user: { id: 1, role: 'aluno' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('calls next when the user is admin in the database', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({ admin: true });
    await requireAdmin({ user: { id: 1, role: 'professor' } } as any, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('ignores an admin claim in the token when the database says otherwise', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({ admin: false });
    await requireAdmin({ user: { id: 1, role: 'professor', admin: true } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the user no longer exists', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    await requireAdmin({ user: { id: 99, role: 'professor' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
