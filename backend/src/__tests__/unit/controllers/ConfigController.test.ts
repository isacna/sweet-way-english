import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  usuario: { update: vi.fn(), create: vi.fn() },
}));
vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed') } }));

import { updateProfessorMe, createProfessorAdmin, updateProfessorAdmin } from '../../../http/controllers/ConfigController.js';
import { mockReq, mockRes } from '../../helpers/mockReqRes.js';

const professor = (overrides: object = {}) =>
  mockReq({ user: { id: 1, email: 'p@t.com', role: 'professor', admin: true }, ...overrides });

describe('ConfigController password and email rules', () => {
  let res: any;
  beforeEach(() => {
    vi.resetAllMocks();
    res = mockRes();
  });

  it('rejects a short password when the professor edits their profile', async () => {
    await updateProfessorMe(professor({ body: { senha: '123' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/pelo menos 6/);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  it('rejects a short password when the admin creates a professor', async () => {
    await createProfessorAdmin(professor({ body: { nome: 'Bia', email: 'b@t.com', senha: '12345' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it('rejects a short password when the admin edits a professor', async () => {
    await updateProfessorAdmin(professor({ params: { id: '2' }, body: { senha: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  it('stores the email in lowercase', async () => {
    prismaMock.usuario.create.mockResolvedValue({ id: 3 });
    await createProfessorAdmin(professor({ body: { nome: 'Bia', email: ' Bia@Escola.COM ', senha: 'senha123' } }), res);
    expect(prismaMock.usuario.create.mock.calls[0][0].data.email).toBe('bia@escola.com');
  });
});
