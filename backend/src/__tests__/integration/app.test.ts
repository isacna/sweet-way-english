import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Prisma mock ──────────────────────────────────────────────────────────────
// authenticateToken consulta `usuario.findUnique({ select: { versaoToken } })` a cada requisição; essa busca
// sempre acha a versão 0 (a dos tokens de mockToken). As demais buscas vão para `usuarioFindUnique`.
const usuarioFindUnique = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  usuario: {
    findUnique: vi.fn((args: { select?: Record<string, boolean> }) =>
      args?.select?.versaoToken && Object.keys(args.select).length === 1
        ? Promise.resolve({ versaoToken: 0 })
        : usuarioFindUnique(args)
    ),
    create: vi.fn(),
  },
  turma: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  matricula: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  atividade: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  submissao: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  feedback: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  materialApoio: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
}));

vi.mock('../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() },
}));
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('test_token'),
    verify: vi.fn(),
  },
}));

// ── App factory ──────────────────────────────────────────────────────────────
import { createApp } from '../../app.js';
import jwt from 'jsonwebtoken';

const createTestApp = createApp;

// Helper: make JWT verify succeed with a given payload
function mockToken(payload: object) {
  (jwt.verify as any).mockImplementation(() => ({ exp: 9999999999, v: 0, ...payload }));
  return 'Bearer test_token';
}

describe('Integration — HTTP API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  // ── Auth ───────────────────────────────────────────────────────────────────
  describe('POST /api/auth/register/professor', () => {
    it('no longer exists (professors are created by the admin)', async () => {
      const res = await request(app)
        .post('/api/auth/register/professor')
        .send({ nome: 'Ana', email: 'ana@t.com', senha: '123456' });
      expect(res.status).toBe(404);
      expect(prismaMock.usuario.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/register/aluno', () => {
    it('returns 201 for an adult', async () => {
      prismaMock.usuario.create.mockResolvedValue({ id: 2 });
      const res = await request(app)
        .post('/api/auth/register/aluno')
        .send({ nome: 'Bob', email: 'bob@t.com', senha: '123456', dataNascimento: '1990-01-01' });
      expect(res.status).toBe(201);
    });

    it('returns 400 on duplicate email', async () => {
      prismaMock.usuario.create.mockRejectedValue(new Error('unique'));
      const res = await request(app)
        .post('/api/auth/register/aluno')
        .send({ nome: 'Bob', email: 'dup@t.com', senha: '123456', dataNascimento: '1990-01-01' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for malformed JSON', async () => {
      const res = await request(app)
        .post('/api/auth/register/aluno')
        .set('Content-Type', 'application/json')
        .send('{"nome":');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns token for valid credentials', async () => {
      const { default: bcrypt } = await import('bcryptjs');
      usuarioFindUnique.mockResolvedValue({
        id: 1, nome: 'Ana', email: 'ana@t.com', senha: 'hashed', papel: 'professor', admin: false,
      });
      (bcrypt.compare as any).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ana@t.com', senha: '123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ role: 'professor', admin: false });
    });

    it('returns 401 for wrong credentials', async () => {
      const { default: bcrypt } = await import('bcryptjs');
      usuarioFindUnique.mockResolvedValue(null);
      (bcrypt.compare as any).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'x@t.com', senha: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  // ── Session cookie ─────────────────────────────────────────────────────────
  describe('session cookie', () => {
    it('login sets an httpOnly, SameSite=Lax cookie (no Secure outside production)', async () => {
      const { default: bcrypt } = await import('bcryptjs');
      usuarioFindUnique.mockResolvedValue({
        id: 1, nome: 'Ana', email: 'ana@t.com', senha: 'hashed', papel: 'aluno', admin: false, versaoToken: 0,
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      const res = await request(app).post('/api/auth/login').send({ email: 'ana@t.com', senha: '123' });
      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toMatch(/^sw_sessao=test_token;/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/Max-Age=604800/);
      expect(cookie).not.toMatch(/Secure/);
    });

    it('GET /api/auth/me works with the cookie alone', async () => {
      mockToken({ id: 1, role: 'aluno', email: 'ana@t.com' });
      usuarioFindUnique.mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@t.com', papel: 'aluno', admin: false, versaoToken: 0 });
      const res = await request(app).get('/api/auth/me').set('Cookie', 'sw_sessao=test_token');
      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: 1, nome: 'Ana', email: 'ana@t.com', role: 'aluno', admin: false });
    });

    it('GET /api/auth/me returns 401 without a session', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('POST /api/auth/logout expires the cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(String(res.headers['set-cookie'])).toMatch(/sw_sessao=;.*Expires=Thu, 01 Jan 1970/);
    });

    it('CORS allows credentials for an allowed origin only', async () => {
      const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
      expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(ok.headers['access-control-allow-credentials']).toBe('true');
      const outra = await request(app).get('/api/health').set('Origin', 'http://evil.example');
      expect(outra.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('POST /api/auth/esqueci-senha answers 200 for an unknown e-mail', async () => {
      usuarioFindUnique.mockResolvedValue(null);
      const res = await request(app).post('/api/auth/esqueci-senha').send({ email: 'ghost@t.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Se houver uma conta/);
    });
  });

  // ── Admin ──────────────────────────────────────────────────────────────────
  describe('admin routes', () => {
    it('returns 403 for a professor who is not admin', async () => {
      usuarioFindUnique.mockResolvedValue({ admin: false });
      const res = await request(app)
        .get('/api/admin/professores')
        .set('Authorization', mockToken({ id: 2, role: 'professor', email: 'p@t.com' }));
      expect(res.status).toBe(403);
    });

    it('returns 403 for an aluno on /professor/me', async () => {
      const res = await request(app)
        .get('/api/professor/me')
        .set('Authorization', mockToken({ id: 10, role: 'aluno', email: 's@t.com' }));
      expect(res.status).toBe(403);
    });
  });

  // ── Uploads ────────────────────────────────────────────────────────────────
  describe('upload limits', () => {
    it('rejects disallowed file types with 415', async () => {
      usuarioFindUnique.mockResolvedValue({ admin: true });
      const res = await request(app)
        .patch('/api/configuracoes/logo')
        .set('Authorization', mockToken({ id: 1, role: 'professor', email: 'a@t.com' }))
        .attach('logo', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
      expect(res.status).toBe(415);
    });

    it('rejects SVG images (can carry scripts)', async () => {
      usuarioFindUnique.mockResolvedValue({ admin: true });
      const res = await request(app)
        .patch('/api/configuracoes/logo')
        .set('Authorization', mockToken({ id: 1, role: 'professor', email: 'a@t.com' }))
        .attach('logo', Buffer.from('<svg/>'), { filename: 'logo.svg', contentType: 'image/svg+xml' });
      expect(res.status).toBe(415);
    });
  });

  // ── Protected routes ───────────────────────────────────────────────────────
  describe('GET /api/turmas', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/turmas');
      expect(res.status).toBe(401);
    });

    it('returns classes for authenticated professor', async () => {
      const classes = [{ id: 1, nome: 'A1', _count: { matriculas: 3 } }];
      prismaMock.turma.findMany.mockResolvedValue(classes);

      const res = await request(app)
        .get('/api/turmas')
        .set('Authorization', mockToken({ id: 1, role: 'professor', email: 'a@t.com' }));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(classes);
    });

    it('returns enrolled classes for authenticated aluno', async () => {
      const turma = { id: 2, nome: 'B1' };
      prismaMock.matricula.findMany.mockResolvedValue([{ turma }]);

      const res = await request(app)
        .get('/api/turmas')
        .set('Authorization', mockToken({ id: 10, role: 'aluno', email: 's@t.com' }));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([turma]);
    });
  });

  describe('POST /api/turmas', () => {
    it('returns 403 when aluno tries to create a class', async () => {
      const res = await request(app)
        .post('/api/turmas')
        .set('Authorization', mockToken({ id: 10, role: 'aluno', email: 's@t.com' }))
        .send({ nome: 'A1' });
      expect(res.status).toBe(403);
    });

    it('creates class and returns 201', async () => {
      prismaMock.turma.count.mockResolvedValue(2);
      prismaMock.turma.create.mockResolvedValue({ id: 3, nome: 'A1', codigoConvite: 'SWB3-2026' });

      const res = await request(app)
        .post('/api/turmas')
        .set('Authorization', mockToken({ id: 1, role: 'professor', email: 'a@t.com' }))
        .send({ nome: 'A1', nivel: 'B' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('codigoConvite');
    });
  });

  describe('GET /api/professor/alunos', () => {
    it('returns 403 for aluno', async () => {
      const res = await request(app)
        .get('/api/professor/alunos')
        .set('Authorization', mockToken({ id: 10, role: 'aluno', email: 's@t.com' }));
      expect(res.status).toBe(403);
    });

    it('returns 200 with student list for professor', async () => {
      prismaMock.matricula.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/professor/alunos')
        .set('Authorization', mockToken({ id: 1, role: 'professor', email: 'a@t.com' }));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Curso autoguiado: guardas de rota ─────────────────────────────────────
  describe('course routes (role guards)', () => {
    const aluno = () => mockToken({ id: 10, role: 'aluno', email: 's@t.com' });
    const professor = () => mockToken({ id: 1, role: 'professor', email: 'a@t.com' });

    const rotasAluno: [string, string][] = [
      ['get', '/api/curso'],
      ['get', '/api/curso/licoes/1'],
      ['post', '/api/curso/exercicios/1/verificar'],
      ['post', '/api/curso/licoes/1/quiz'],
      ['get', '/api/curso/revisao'],
      ['post', '/api/curso/revisao/1'],
      ['post', '/api/curso/modulos/1/teste'],
      ['post', '/api/curso/tentativas/1'],
      ['patch', '/api/curso/perfil'],
    ];
    const rotasProfessor: [string, string][] = [
      ['get', '/api/conteudo'],
      ['get', '/api/conteudo/licoes/1'],
      ['put', '/api/conteudo/licoes/1'],
      ['patch', '/api/conteudo/licoes/1/status'],
      ['patch', '/api/conteudo/modulos/1/status'],
      ['get', '/api/conteudo/modulos/1/teste'],
      ['post', '/api/conteudo/exercicios/verificar'],
      ['get', '/api/professor/progresso'],
    ];

    it.each([...rotasAluno, ...rotasProfessor])('%s %s returns 401 without token', async (metodo, rota) => {
      const res = await (request(app) as any)[metodo](rota);
      expect(res.status).toBe(401);
    });

    it.each(rotasAluno)('%s %s returns 403 for a professor', async (metodo, rota) => {
      const res = await (request(app) as any)[metodo](rota).set('Authorization', professor()).send({});
      expect(res.status).toBe(403);
    });

    it.each(rotasProfessor)('%s %s returns 403 for an aluno', async (metodo, rota) => {
      const res = await (request(app) as any)[metodo](rota).set('Authorization', aluno()).send({});
      expect(res.status).toBe(403);
    });

    it('lets an aluno reach the controller (400 on invalid body)', async () => {
      const res = await request(app).patch('/api/curso/perfil').set('Authorization', aluno()).send({ metodologia: 'xyz' });
      expect(res.status).toBe(400);
    });

    it('lets a professor reach the controller (400 on invalid body)', async () => {
      const res = await request(app)
        .post('/api/conteudo/exercicios/verificar')
        .set('Authorization', professor())
        .send({ item: { tipo: 'mcq' }, resposta: 0 });
      expect(res.status).toBe(400);
    });

    it('sends async controller errors to the error handler (500, not a crash)', async () => {
      const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await request(app).get('/api/conteudo').set('Authorization', professor());
      expect(res.status).toBe(500); // prisma.nivel não existe no mock
      silencio.mockRestore();
    });
  });

  describe('legacy routes go through the async handler', () => {
    it('turns a database error in GET /api/turmas into a 500 instead of crashing', async () => {
      prismaMock.turma.findMany.mockRejectedValue(new Error('db down'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await request(app).get('/api/turmas').set('Authorization', mockToken({ id: 1, role: 'professor' }));
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Erro interno do servidor' });
      spy.mockRestore();
    });

    it('turns a database error in POST /api/atividades/:id/submissoes into a 500', async () => {
      prismaMock.atividade.findUnique.mockRejectedValue(new Error('db down'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await request(app)
        .post('/api/atividades/1/submissoes')
        .set('Authorization', mockToken({ id: 2, role: 'aluno' }))
        .field('comentario', 'oi');
      expect(res.status).toBe(500);
      spy.mockRestore();
    });
  });

  describe('activity routers', () => {
    it('no longer accepts POST on /api/professor/atividades (was mounted twice)', async () => {
      const res = await request(app)
        .post('/api/professor/atividades')
        .set('Authorization', mockToken({ id: 1, role: 'professor' }))
        .send({ titulo: 'x' });
      expect(res.status).toBe(404);
      expect(prismaMock.atividade.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/health', () => {
    it('returns ok when the database answers', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('returns 503 when the database is down', async () => {
      prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(503);
      spy.mockRestore();
    });
  });

  describe('GET /api/alunos/me/feedbacks', () => {
    it('returns feedbacks for authenticated aluno', async () => {
      prismaMock.feedback.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/alunos/me/feedbacks')
        .set('Authorization', mockToken({ id: 10, role: 'aluno', email: 's@t.com' }));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
