// Rotas antigas (turmas, atividades, avisos, materiais, entregas, feedbacks, alunos, admin) pela pilha HTTP real:
// requireRole nas rotas (403 antes de qualquer consulta ou upload) e validação zod (400 antes de tocar no banco).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// authenticateToken busca `usuario.findUnique({ select: { versaoToken } })`; as outras buscas (ex.: requireAdmin)
// vão para `usuarioFindUnique`.
const usuarioFindUnique = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => {
  const modelo = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  });
  return {
    usuario: {
      ...modelo(),
      findUnique: vi.fn((args: { select?: Record<string, boolean> }) =>
        args?.select?.versaoToken && Object.keys(args.select).length === 1
          ? Promise.resolve({ versaoToken: 0 })
          : usuarioFindUnique(args),
      ),
    },
    turma: modelo(),
    matricula: modelo(),
    atividade: modelo(),
    aviso: modelo(),
    submissao: modelo(),
    feedback: modelo(),
    materialApoio: modelo(),
    arquivo: modelo(),
    $transaction: vi.fn(),
  };
});

vi.mock('../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn().mockReturnValue('t'), verify: vi.fn() } }));

import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { FIXTURES } from '../helpers/fixturesArquivos.js';

function como(role: 'professor' | 'aluno', id = role === 'professor' ? 1 : 2) {
  (jwt.verify as any).mockImplementation(() => ({ id, email: 'x@t.com', role, exp: 9999999999, v: 0 }));
  return 'Bearer t';
}

/** Nenhuma consulta além da busca de sessão do authenticateToken. */
function nadaNoBanco() {
  for (const [nome, modelo] of Object.entries(prismaMock)) {
    if (nome === 'usuario' || typeof modelo === 'function') continue;
    for (const fn of Object.values(modelo as Record<string, ReturnType<typeof vi.fn>>)) expect(fn).not.toHaveBeenCalled();
  }
  expect(prismaMock.$transaction).not.toHaveBeenCalled();
}

type Metodo = 'get' | 'post' | 'patch' | 'delete';

describe('legacy routes — role guards and validation', () => {
  const app = createApp();
  beforeEach(() => vi.clearAllMocks());

  describe('requireRole: a student on professor routes gets 403 before any query', () => {
    it.each<[Metodo, string]>([
      ['post', '/api/turmas'],
      ['post', '/api/turmas/1/atividades'],
      ['patch', '/api/professor/atividades/1'],
      ['post', '/api/turmas/1/avisos'],
      ['delete', '/api/turmas/1/avisos/2'],
      ['post', '/api/turmas/1/materiais'],
      ['delete', '/api/turmas/1/materiais/2'],
      ['get', '/api/atividades/1/submissoes'],
      ['patch', '/api/professor/submissoes/1'],
      ['post', '/api/submissoes/1/feedback'],
      ['get', '/api/professor/alunos'],
      ['post', '/api/professor/alunos'],
      ['patch', '/api/professor/alunos/3'],
      ['delete', '/api/professor/alunos/3'],
      ['get', '/api/professor/me'],
      ['patch', '/api/professor/me'],
    ])('%s %s → 403', async (metodo, url) => {
      const res = await request(app)[metodo](url).set('Authorization', como('aluno')).send({});
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Acesso negado' });
      nadaNoBanco();
    });
  });

  describe('requireRole: a professor on student-only routes gets 403', () => {
    it.each<[Metodo, string]>([
      ['post', '/api/turmas/entrar'],
      ['post', '/api/atividades/1/submissoes'],
      ['get', '/api/alunos/me/feedbacks'],
    ])('%s %s → 403', async (metodo, url) => {
      const res = await request(app)[metodo](url).set('Authorization', como('professor')).send({});
      expect(res.status).toBe(403);
      nadaNoBanco();
    });
  });

  it('a student uploading to a teacher route is refused before the upload is read', async () => {
    const res = await request(app)
      .post('/api/turmas/1/materiais')
      .set('Authorization', como('aluno'))
      .field('titulo', 'x')
      .field('tipo', 'pdf')
      .attach('arquivo', FIXTURES.pdf, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(403);
    nadaNoBanco();
  });

  it('requires a session (401) before the role check', async () => {
    const res = await request(app).get('/api/professor/alunos');
    expect(res.status).toBe(401);
  });

  describe('ids in the URL must be positive integers → 400', () => {
    it.each<[Metodo, string, 'professor' | 'aluno', string]>([
      ['get', '/api/turmas/abc', 'professor', 'ID inválido'],
      ['get', '/api/turmas/1abc', 'professor', 'ID inválido'],
      ['get', '/api/turmas/0', 'aluno', 'ID inválido'],
      ['get', '/api/turmas/1.5', 'aluno', 'ID inválido'],
      ['get', '/api/turmas/99999999999', 'professor', 'ID inválido'],
      ['get', '/api/turmas/-1/atividades', 'professor', 'Turma inválida'],
      ['get', '/api/turmas/x/avisos', 'aluno', 'Turma inválida'],
      ['delete', '/api/turmas/1/avisos/x', 'professor', 'ID inválido'],
      ['get', '/api/turmas/x/materiais', 'professor', 'Turma inválida'],
      ['delete', '/api/turmas/1/materiais/0', 'professor', 'ID inválido'],
      ['post', '/api/atividades/x/submissoes', 'aluno', 'Atividade inválida'],
      ['get', '/api/atividades/x/submissoes', 'professor', 'ID inválido'],
      ['patch', '/api/professor/submissoes/x', 'professor', 'ID inválido'],
      ['post', '/api/submissoes/x/feedback', 'professor', 'ID inválido'],
      ['patch', '/api/professor/atividades/x', 'professor', 'ID inválido'],
      ['delete', '/api/professor/alunos/x', 'professor', 'ID inválido'],
    ])('%s %s (%s) → 400 "%s"', async (metodo, url, role, erro) => {
      const res = await request(app)[metodo](url).set('Authorization', como(role)).send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: erro });
      nadaNoBanco();
    });
  });

  describe('bodies are validated before the database → 400', () => {
    it.each<[Metodo, string, 'professor' | 'aluno', object, string]>([
      ['post', '/api/turmas', 'professor', {}, 'Nome da turma é obrigatório'],
      ['post', '/api/turmas/entrar', 'aluno', {}, 'Informe o código de convite'],
      ['post', '/api/turmas/1/atividades', 'professor', { descricao: 'd', dataEntrega: '2026-12-01' }, 'Título é obrigatório'],
      ['post', '/api/turmas/1/atividades', 'professor', { titulo: 't', descricao: 'd', dataEntrega: 'amanhã' }, 'Data de entrega inválida'],
      ['patch', '/api/professor/atividades/1', 'professor', { titulo: '  ' }, 'Título não pode ser vazio'],
      ['post', '/api/turmas/1/avisos', 'professor', { conteudo: 'sem título' }, 'Título é obrigatório'],
      ['post', '/api/turmas/1/materiais', 'professor', { titulo: 'x', tipo: 'planilha', url: 'https://x' }, 'Tipo inválido. Use: pdf, audio, video, link'],
      ['patch', '/api/professor/submissoes/1', 'professor', { status: 'corrigido' }, 'Envie status: "aprovado" ou "reprovado"'],
      ['post', '/api/submissoes/1/feedback', 'professor', { comentario: 'ok', nota: 'dez' }, 'Nota inválida'],
      ['post', '/api/professor/alunos', 'professor', { nome: 'A', email: 'a@t.com' }, 'Nome, email e senha são obrigatórios'],
      ['patch', '/api/professor/alunos/3', 'professor', { email: 'nao-e-email' }, 'Email inválido'],
      ['patch', '/api/professor/me', 'professor', { senha: '123' }, 'A senha precisa ter pelo menos 6 caracteres'],
    ])('%s %s (%s) %o → 400 "%s"', async (metodo, url, role, corpo, erro) => {
      const res = await request(app)[metodo](url).set('Authorization', como(role)).send(corpo);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: erro });
      nadaNoBanco();
    });
  });

  describe('admin routes', () => {
    it('validate the id after requireAdmin', async () => {
      usuarioFindUnique.mockResolvedValue({ admin: true });
      const res = await request(app).patch('/api/admin/professores/abc').set('Authorization', como('professor')).send({ nome: 'X' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ID inválido' });
    });

    it('a non-admin professor gets 403', async () => {
      usuarioFindUnique.mockResolvedValue({ admin: false });
      const res = await request(app).post('/api/admin/professores').set('Authorization', como('professor')).send({});
      expect(res.status).toBe(403);
      expect(prismaMock.usuario.create).not.toHaveBeenCalled();
    });

    it('a database error in requireAdmin is a 500, not a crash', async () => {
      usuarioFindUnique.mockRejectedValue(new Error('db down'));
      const res = await request(app).get('/api/admin/professores').set('Authorization', como('professor'));
      expect(res.status).toBe(500);
    });

    it('validates the new professor body', async () => {
      usuarioFindUnique.mockResolvedValue({ admin: true });
      const res = await request(app)
        .post('/api/admin/professores')
        .set('Authorization', como('professor'))
        .send({ nome: 'Ana', email: 'ana@t.com', senha: '  12  ' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'A senha precisa ter pelo menos 6 caracteres' });
    });
  });

  it('typed service errors keep the old status and message (403 "Turma não encontrada" for an aviso in another class)', async () => {
    prismaMock.turma.findFirst.mockResolvedValue(null);
    const res = await request(app).post('/api/turmas/7/avisos').set('Authorization', como('professor')).send({ titulo: 'Oi' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Turma não encontrada' });
  });

  it('every response carries an X-Request-Id', async () => {
    const res = await request(app).get('/api/turmas/abc').set('Authorization', como('professor'));
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});
