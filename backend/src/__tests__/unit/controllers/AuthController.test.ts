import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  professor: { findUnique: vi.fn(), create: vi.fn() },
  aluno: { findUnique: vi.fn(), create: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() },
}));
vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn().mockReturnValue('mock_token') },
}));

import bcrypt from 'bcryptjs';
import { registerProfessor, registerStudent, login } from '../../../http/controllers/AuthController.js';
import { mockRes } from '../../helpers/mockReqRes.js';

describe('AuthController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
    (bcrypt.hash as any).mockResolvedValue('hashed');
  });

  describe('registerProfessor', () => {
    it('returns 201 on success', async () => {
      prismaMock.professor.create.mockResolvedValue({ id: 1 });
      await registerProfessor({ body: { nome: 'Ana', email: 'ana@t.com', senha: '123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Professor criado com sucesso' });
    });

    it('returns 400 on duplicate email', async () => {
      prismaMock.professor.create.mockRejectedValue(new Error('unique constraint'));
      await registerProfessor({ body: { nome: 'Ana', email: 'dup@t.com', senha: '123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email já cadastrado' });
    });

    it('hashes the password before saving', async () => {
      prismaMock.professor.create.mockResolvedValue({ id: 1 });
      await registerProfessor({ body: { nome: 'Ana', email: 'ana@t.com', senha: 'plain' } } as any, res);
      expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);
      expect(prismaMock.professor.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ senha: 'hashed' }) })
      );
    });
  });

  describe('registerStudent', () => {
    it('returns 201 on success', async () => {
      prismaMock.aluno.create.mockResolvedValue({ id: 2 });
      await registerStudent({ body: { nome: 'Bob', email: 'bob@t.com', senha: '123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Aluno criado com sucesso' });
    });

    it('returns 400 on duplicate email', async () => {
      prismaMock.aluno.create.mockRejectedValue(new Error('unique constraint'));
      await registerStudent({ body: { nome: 'Bob', email: 'dup@t.com', senha: '123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('returns token and user when professor credentials are correct', async () => {
      prismaMock.professor.findUnique.mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@t.com', senha: 'hashed' });
      (bcrypt.compare as any).mockResolvedValue(true);
      await login({ body: { email: 'ana@t.com', senha: '123' } } as any, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'mock_token', user: expect.objectContaining({ role: 'professor' }) })
      );
    });

    it('falls back to aluno when not found as professor', async () => {
      prismaMock.professor.findUnique.mockResolvedValue(null);
      prismaMock.aluno.findUnique.mockResolvedValue({ id: 2, nome: 'Bob', email: 'bob@t.com', senha: 'hashed' });
      (bcrypt.compare as any).mockResolvedValue(true);
      await login({ body: { email: 'bob@t.com', senha: '123' } } as any, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ role: 'aluno' }) })
      );
    });

    it('returns 401 on wrong password', async () => {
      prismaMock.professor.findUnique.mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@t.com', senha: 'hashed' });
      (bcrypt.compare as any).mockResolvedValue(false);
      await login({ body: { email: 'ana@t.com', senha: 'wrong' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' });
    });

    it('returns 401 when user does not exist', async () => {
      prismaMock.professor.findUnique.mockResolvedValue(null);
      prismaMock.aluno.findUnique.mockResolvedValue(null);
      (bcrypt.compare as any).mockResolvedValue(false);
      await login({ body: { email: 'ghost@t.com', senha: '123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
