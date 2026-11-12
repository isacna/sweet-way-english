import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const prismaMock = vi.hoisted(() => ({
  perfilAprendiz: { updateMany: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('../../../email/index.js', () => ({ enviarEmail: vi.fn() }));

import { cancelar, MSG_LEMBRETES_CANCELADOS } from '../../../http/controllers/LembreteController.js';
import { tokenCancelarLembretes } from '../../../services/lembretes.js';
import { env } from '../../../config/env.js';
import { executar, mockReq, mockRes } from '../../helpers/mockReqRes.js';

// Rota pública: sem usuário na requisição
const req = (overrides: object) => mockReq({ user: undefined, ...overrides } as any);

describe('LembreteController.cancelar', () => {
  let res: any;

  beforeEach(() => {
    vi.resetAllMocks();
    res = mockRes();
    prismaMock.perfilAprendiz.updateMany.mockResolvedValue({ count: 1 });
  });

  it('turns the reminders off with the token in the body', async () => {
    await executar(cancelar as any, req({ body: { token: tokenCancelarLembretes(42) } }), res);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: MSG_LEMBRETES_CANCELADOS });
    expect(prismaMock.perfilAprendiz.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 42 },
      data: { lembretesEmail: false },
    });
  });

  it('accepts the token in the query (List-Unsubscribe one-click POST, no JSON body)', async () => {
    await executar(cancelar as any, req({ body: undefined, query: { token: tokenCancelarLembretes(7) } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: MSG_LEMBRETES_CANCELADOS });
    expect(prismaMock.perfilAprendiz.updateMany.mock.calls[0][0].where).toEqual({ usuarioId: 7 });
  });

  it('answers the same for a valid token whether or not anything changed', async () => {
    prismaMock.perfilAprendiz.updateMany.mockResolvedValue({ count: 0 });
    await executar(cancelar as any, req({ body: { token: tokenCancelarLembretes(42) } }), res);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: MSG_LEMBRETES_CANCELADOS });
  });

  it.each([
    ['missing', {}],
    ['empty', { token: '  ' }],
    ['not a string', { token: 123 }],
    ['garbage', { token: 'abc.def.ghi' }],
    ['too long', { token: 'a'.repeat(3000) }],
    ['a session token', { token: jwt.sign({ id: 42, email: 'a@t.com', role: 'aluno', v: 0 }, env.JWT_SECRET, { expiresIn: '7d' }) }],
    ['expired', { token: jwt.sign({ tipo: 'cancelar-lembretes', id: 42 }, env.JWT_SECRET, { expiresIn: -10 }) }],
  ])('returns 400 for a %s token', async (_nome, body) => {
    await executar(cancelar as any, req({ body }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/Link inválido ou expirado/);
    expect(prismaMock.perfilAprendiz.updateMany).not.toHaveBeenCalled();
  });
});
