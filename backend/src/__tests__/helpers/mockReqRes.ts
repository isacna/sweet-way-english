import { vi } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../../types/index.js';
import { errorHandler } from '../../http/middlewares/errorHandler.js';

export function mockRes() {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  res.cookie.mockReturnValue(res);
  res.clearCookie.mockReturnValue(res);
  return res as Response;
}

export function mockReq(overrides: Partial<AuthRequest & { file?: Express.Multer.File }> = {}): AuthRequest {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 1, email: 'professor@test.com', role: 'professor' },
    ...overrides,
  } as unknown as AuthRequest;
}

export function studentReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return mockReq({ user: { id: 10, email: 'aluno@test.com', role: 'aluno' }, ...overrides });
}

/**
 * Chama o controller como a rota faz: um erro lançado (ErroValidacao, ErroNaoEncontrado...) passa pelo errorHandler
 * real, então o teste confere `res.status`/`res.json` como antes.
 */
export async function executar(
  handler: (req: AuthRequest, res: Response) => unknown,
  req: AuthRequest,
  res: Response,
) {
  try {
    await handler(req, res);
  } catch (err) {
    errorHandler(err, req, res, () => {});
  }
}
