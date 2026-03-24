import { vi } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../../types/index.js';

export function mockRes() {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
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
