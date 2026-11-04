import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  usuario: { findUnique: vi.fn(), create: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() },
}));
vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn().mockReturnValue('mock_token') },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerStudent, login } from '../../../http/controllers/AuthController.js';
import { mockRes } from '../../helpers/mockReqRes.js';

const adulto = { nome: 'Bob', email: 'bob@t.com', senha: '123456', dataNascimento: '1990-05-10' };

function anosAtras(anos: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anos);
  return d.toISOString().slice(0, 10);
}

describe('AuthController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
    (bcrypt.hash as any).mockResolvedValue('hashed');
  });

  describe('registerStudent', () => {
    it('returns 201 and always creates an aluno', async () => {
      prismaMock.usuario.create.mockResolvedValue({ id: 2 });
      await registerStudent({ body: { ...adulto, papel: 'professor' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Aluno criado com sucesso' });
      expect(prismaMock.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ papel: 'aluno', senha: 'hashed' }) })
      );
    });

    it('normalizes email to lowercase', async () => {
      prismaMock.usuario.create.mockResolvedValue({ id: 2 });
      await registerStudent({ body: { ...adulto, email: ' Bob@T.com ' } } as any, res);
      expect(prismaMock.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'bob@t.com' }) })
      );
    });

    it('returns 400 on duplicate email', async () => {
      prismaMock.usuario.create.mockRejectedValue(new Error('unique constraint'));
      await registerStudent({ body: adulto } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email já cadastrado' });
    });

    it('returns 400 when password is too short', async () => {
      await registerStudent({ body: { ...adulto, senha: '123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.usuario.create).not.toHaveBeenCalled();
    });

    it('returns 400 without birth date', async () => {
      const { dataNascimento: _, ...semData } = adulto;
      await registerStudent({ body: semData } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects a minor without guardian consent', async () => {
      await registerStudent({ body: { ...adulto, dataNascimento: anosAtras(15) } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.usuario.create).not.toHaveBeenCalled();
    });

    it('accepts a minor with guardian consent and records when it was given', async () => {
      prismaMock.usuario.create.mockResolvedValue({ id: 3 });
      await registerStudent({
        body: {
          ...adulto,
          dataNascimento: anosAtras(15),
          responsavelNome: 'Mãe',
          responsavelEmail: 'mae@t.com',
          consentimentoResponsavel: true,
        },
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(prismaMock.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ responsavelEmail: 'mae@t.com', consentimentoResponsavelEm: expect.any(Date) }),
        })
      );
    });
  });

  describe('login', () => {
    it('returns token and user with papel and admin flag', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 1, nome: 'Ana', email: 'ana@t.com', senha: 'hashed', papel: 'professor', admin: true,
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      await login({ body: { email: 'ana@t.com', senha: '123' } } as any, res);
      expect(res.json).toHaveBeenCalledWith({
        token: 'mock_token',
        user: { id: 1, nome: 'Ana', email: 'ana@t.com', role: 'professor', admin: true },
      });
    });

    it('signs the token with an expiration', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 2, nome: 'Bob', email: 'bob@t.com', senha: 'hashed', papel: 'aluno', admin: false,
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      await login({ body: { email: 'bob@t.com', senha: '123' } } as any, res);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, role: 'aluno' }),
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.anything() })
      );
    });

    it('falls back to the lowercase email', async () => {
      prismaMock.usuario.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 2, nome: 'Bob', email: 'bob@t.com', senha: 'hashed', papel: 'aluno', admin: false });
      (bcrypt.compare as any).mockResolvedValue(true);
      await login({ body: { email: 'Bob@T.com', senha: '123' } } as any, res);
      expect(prismaMock.usuario.findUnique).toHaveBeenLastCalledWith({ where: { email: 'bob@t.com' } });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mock_token' }));
    });

    it('returns 401 on wrong password', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@t.com', senha: 'hashed', papel: 'professor' });
      (bcrypt.compare as any).mockResolvedValue(false);
      await login({ body: { email: 'ana@t.com', senha: 'wrong' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' });
    });

    it('returns 401 when user does not exist', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      await login({ body: { email: 'ghost@t.com', senha: '123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 when fields are missing', async () => {
      await login({ body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
