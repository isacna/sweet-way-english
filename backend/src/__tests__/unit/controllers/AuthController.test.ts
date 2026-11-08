import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  usuario: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  tokenSenha: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
const enviarEmailMock = vi.hoisted(() => vi.fn());

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('../../../email/index.js', () => ({ enviarEmail: enviarEmailMock }));
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() },
}));
vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn().mockReturnValue('mock_token') },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import {
  registerStudent,
  login,
  logout,
  me,
  esqueciSenha,
  redefinirSenha,
  MSG_ESQUECI_SENHA,
} from '../../../http/controllers/AuthController.js';
import { mockReq, mockRes } from '../../helpers/mockReqRes.js';

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

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

    it('looks the user up once by the normalized email', async () => {
      prismaMock.usuario.findUnique.mockResolvedValueOnce({
        id: 2, nome: 'Bob', email: 'bob@t.com', senha: 'hashed', papel: 'aluno', admin: false,
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      await login({ body: { email: ' Bob@T.com ', senha: '123' } } as any, res);
      expect(prismaMock.usuario.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({ where: { email: 'bob@t.com' } });
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
  describe('session cookie', () => {
    const usuario = { id: 3, nome: 'Cris', email: 'cris@t.com', senha: 'hashed', papel: 'aluno', admin: false, versaoToken: 4 };

    it('login sets the httpOnly sw_sessao cookie and embeds versaoToken as v', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(usuario);
      (bcrypt.compare as any).mockResolvedValue(true);
      await login({ body: { email: 'cris@t.com', senha: '123' } } as any, res);
      expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ id: 3, v: 4 }), expect.any(String), expect.anything());
      expect(res.cookie).toHaveBeenCalledWith(
        'sw_sessao',
        'mock_token',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: 7 * 86400 * 1000 })
      );
    });

    it('does not set the cookie on wrong credentials', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(usuario);
      (bcrypt.compare as any).mockResolvedValue(false);
      await login({ body: { email: 'cris@t.com', senha: 'x' } } as any, res);
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('logout clears the cookie with the same options', async () => {
      await logout({} as any, res);
      expect(res.clearCookie).toHaveBeenCalledWith('sw_sessao', expect.objectContaining({ httpOnly: true, path: '/' }));
      expect(res.json).toHaveBeenCalledWith({ message: 'Sessão encerrada' });
    });

    it('me returns the same user object as login', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(usuario);
      await me(mockReq({ user: { id: 3, email: 'cris@t.com', role: 'aluno' } }), res);
      expect(res.json).toHaveBeenCalledWith({
        user: { id: 3, nome: 'Cris', email: 'cris@t.com', role: 'aluno', admin: false },
      });
    });

    it('me returns 401 and clears the cookie when the user is gone', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      await me(mockReq({ user: { id: 3, email: 'cris@t.com', role: 'aluno' } }), res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.clearCookie).toHaveBeenCalled();
    });
  });

  describe('esqueciSenha', () => {
    it('answers the same generic message when the account does not exist', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      await esqueciSenha({ body: { email: 'ghost@t.com' } } as any, res);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: MSG_ESQUECI_SENHA });
      expect(prismaMock.tokenSenha.create).not.toHaveBeenCalled();
      expect(enviarEmailMock).not.toHaveBeenCalled();
    });

    it('stores only the SHA-256 of the token, drops older unused tokens and e-mails the link', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 7, nome: 'Ana Souza', email: 'ana@t.com' });
      prismaMock.$transaction.mockResolvedValue([]);
      enviarEmailMock.mockResolvedValue(undefined);

      await esqueciSenha({ body: { email: ' ANA@t.com ' } } as any, res);

      expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'ana@t.com' } }));
      expect(res.json).toHaveBeenCalledWith({ message: MSG_ESQUECI_SENHA });
      expect(prismaMock.tokenSenha.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 7, usadoEm: null } });

      const dados = prismaMock.tokenSenha.create.mock.calls[0][0].data;
      const email = enviarEmailMock.mock.calls[0][0];
      expect(email.para).toBe('ana@t.com');
      const token = /redefinir-senha\?token=([0-9a-f]+)/.exec(email.texto)![1];
      expect(token).toHaveLength(64); // 32 bytes em hex
      expect(email.html).toContain(`http://localhost:3000/redefinir-senha?token=${token}`);
      expect(dados.hashToken).toBe(sha256(token));
      expect(dados.hashToken).not.toBe(token);
      const validadeMs = dados.expiraEm.getTime() - Date.now();
      expect(validadeMs).toBeGreaterThan(59 * 60 * 1000);
      expect(validadeMs).toBeLessThanOrEqual(60 * 60 * 1000);
    });

    it('still answers 200 when the e-mail provider fails', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 7, nome: 'Ana', email: 'ana@t.com' });
      prismaMock.$transaction.mockResolvedValue([]);
      enviarEmailMock.mockRejectedValue(new Error('provider down'));
      const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
      await esqueciSenha({ body: { email: 'ana@t.com' } } as any, res);
      await new Promise((r) => setImmediate(r));
      expect(res.json).toHaveBeenCalledWith({ message: MSG_ESQUECI_SENHA });
      expect(erro).toHaveBeenCalled();
      erro.mockRestore();
    });

    it('returns 400 for an invalid e-mail', async () => {
      await esqueciSenha({ body: { email: 'nao-e-email' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('redefinirSenha', () => {
    const token = 'a'.repeat(64);
    const valido = () => ({ id: 5, usuarioId: 7, hashToken: sha256(token), expiraEm: new Date(Date.now() + 60_000), usadoEm: null });

    beforeEach(() => {
      prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
      prismaMock.tokenSenha.updateMany.mockResolvedValue({ count: 1 });
    });

    it('updates the password, marks the token used and bumps versaoToken', async () => {
      prismaMock.tokenSenha.findUnique.mockResolvedValue(valido());
      await redefinirSenha({ body: { token, senha: 'nova123' } } as any, res);

      expect(prismaMock.tokenSenha.findUnique).toHaveBeenCalledWith({ where: { hashToken: sha256(token) } });
      expect(prismaMock.tokenSenha.updateMany).toHaveBeenCalledWith({
        where: { id: 5, usadoEm: null },
        data: { usadoEm: expect.any(Date) },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('nova123', 10);
      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { senha: 'hashed', versaoToken: { increment: 1 } },
      });
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringMatching(/Senha alterada/) });
      expect(res.clearCookie).toHaveBeenCalled();
    });

    it('rejects an unknown token', async () => {
      prismaMock.tokenSenha.findUnique.mockResolvedValue(null);
      await redefinirSenha({ body: { token, senha: 'nova123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      prismaMock.tokenSenha.findUnique.mockResolvedValue({ ...valido(), expiraEm: new Date(Date.now() - 1000) });
      await redefinirSenha({ body: { token, senha: 'nova123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it('rejects a token that was already used', async () => {
      prismaMock.tokenSenha.findUnique.mockResolvedValue({ ...valido(), usadoEm: new Date() });
      await redefinirSenha({ body: { token, senha: 'nova123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it('rejects when a concurrent request used the token first', async () => {
      prismaMock.tokenSenha.findUnique.mockResolvedValue(valido());
      prismaMock.tokenSenha.updateMany.mockResolvedValue({ count: 0 });
      await redefinirSenha({ body: { token, senha: 'nova123' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it('rejects a password shorter than 6 characters', async () => {
      await redefinirSenha({ body: { token, senha: '12345' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/pelo menos 6/);
      expect(prismaMock.tokenSenha.findUnique).not.toHaveBeenCalled();
    });
  });
});
