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

describe('authenticateToken', () => {
  let req: Partial<Request>;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', () => {
    authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token is empty', () => {
    req.headers = { authorization: 'Bearer ' };
    authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid or expired', () => {
    req.headers = { authorization: 'Bearer bad.token' };
    (jwt.verify as any).mockImplementation((_t: any, _s: any, cb: any) =>
      cb(new Error('invalid'), null)
    );
    authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches user when token is valid', () => {
    req.headers = { authorization: 'Bearer valid.token' };
    const payload = { id: 1, email: 'a@b.com', role: 'professor', exp: 9999999999 };
    (jwt.verify as any).mockImplementation((_t: any, _s: any, cb: any) => cb(null, payload));
    authenticateToken(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual(payload);
  });
});

describe('authenticateToken — legacy tokens', () => {
  it('returns 401 for a token without expiration', () => {
    const req: any = { headers: { authorization: 'Bearer old.token' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();
    (jwt.verify as any).mockImplementation((_t: any, _s: any, cb: any) => cb(null, { id: 1, role: 'professor' }));
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
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
