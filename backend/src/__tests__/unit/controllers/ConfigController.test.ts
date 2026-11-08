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

  it('bumps versaoToken when an admin changes a professor password', async () => {
    prismaMock.usuario.update.mockResolvedValue({ id: 2 });
    await updateProfessorAdmin(professor({ params: { id: '2' }, body: { senha: 'nova1234' } }), res);
    expect(prismaMock.usuario.update.mock.calls[0][0].data.versaoToken).toEqual({ increment: 1 });
  });

  it('does not bump versaoToken when only the name changes', async () => {
    prismaMock.usuario.update.mockResolvedValue({ id: 2 });
    await updateProfessorAdmin(professor({ params: { id: '2' }, body: { nome: 'Bia' } }), res);
    expect(prismaMock.usuario.update.mock.calls[0][0].data.versaoToken).toBeUndefined();
  });

  it('changing your own password bumps versaoToken and renews this session cookie', async () => {
    prismaMock.usuario.update.mockResolvedValue({
      id: 1, nome: 'Paula', email: 'p@t.com', criadoEm: new Date(0), papel: 'professor', admin: true, versaoToken: 5,
    });
    await updateProfessorMe(professor({ body: { senha: 'nova1234' } }), res);
    expect(prismaMock.usuario.update.mock.calls[0][0].data.versaoToken).toEqual({ increment: 1 });
    expect(res.cookie).toHaveBeenCalledWith('sw_sessao', expect.any(String), expect.objectContaining({ httpOnly: true }));
    expect(res.json).toHaveBeenCalledWith({ id: 1, nome: 'Paula', email: 'p@t.com', criadoEm: new Date(0) });
  });
});
