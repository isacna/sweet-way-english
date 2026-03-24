import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));

import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../../http/middlewares/auth.js';

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

  it('returns 403 when token is invalid', () => {
    req.headers = { authorization: 'Bearer bad.token' };
    (jwt.verify as any).mockImplementation((_t: any, _s: any, cb: any) =>
      cb(new Error('invalid'), null)
    );
    authenticateToken(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches user when token is valid', () => {
    req.headers = { authorization: 'Bearer valid.token' };
    const payload = { id: 1, email: 'a@b.com', role: 'professor' };
    (jwt.verify as any).mockImplementation((_t: any, _s: any, cb: any) => cb(null, payload));
    authenticateToken(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual(payload);
  });
});
