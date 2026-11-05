import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// ── Prisma mock ──────────────────────────────────────────────────────────────
const prismaMock = vi.hoisted(() => ({
  usuario: { findUnique: vi.fn(), create: vi.fn() },
  turma: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  matricula: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  atividade: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  submissao: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  feedback: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  materialApoio: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
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
  (jwt.verify as any).mockImplementation((_t: any, _s: any, cb: any) => cb(null, { exp: 9999999999, ...payload }));
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
      prismaMock.usuario.findUnique.mockResolvedValue({
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
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      (bcrypt.compare as any).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'x@t.com', senha: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  // ── Admin ──────────────────────────────────────────────────────────────────
  describe('admin routes', () => {
    it('returns 403 for a professor who is not admin', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ admin: false });
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
      prismaMock.usuario.findUnique.mockResolvedValue({ admin: true });
      const res = await request(app)
        .patch('/api/configuracoes/logo')
        .set('Authorization', mockToken({ id: 1, role: 'professor', email: 'a@t.com' }))
        .attach('logo', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
      expect(res.status).toBe(415);
    });

    it('rejects SVG images (can carry scripts)', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ admin: true });
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

  // ── Auditoria de segurança: regressões ────────────────────────────────────
  describe('security regressions', () => {
    const aluno = () => mockToken({ id: 10, role: 'aluno', email: 's@t.com' });
    const professor = () => mockToken({ id: 1, role: 'professor', email: 'a@t.com' });

    it('returns 400 (not a crash) for a non-numeric class id', async () => {
      const res = await request(app).get('/api/turmas/abc').set('Authorization', aluno());
      expect(res.status).toBe(400);
      expect(prismaMock.turma.findUnique).not.toHaveBeenCalled();
    });

    it('returns 400 when joining a class without a string invite code', async () => {
      const res = await request(app).post('/api/turmas/entrar').set('Authorization', aluno()).send({ codigoConvite: { x: 1 } });
      expect(res.status).toBe(400);
    });

    it('sends legacy controller errors to the error handler (500, not a crash)', async () => {
      const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
      prismaMock.turma.findMany.mockRejectedValue(new Error('SQLITE_BUSY'));
      const res = await request(app).get('/api/turmas').set('Authorization', professor());
      expect(res.status).toBe(500);
      silencio.mockRestore();
    });

    it('rejects oversized answers before grading', async () => {
      const res = await request(app)
        .post('/api/curso/exercicios/1/verificar')
        .set('Authorization', aluno())
        .send({ resposta: [' '.repeat(10_000)] });
      expect(res.status).toBe(400);
    });

    it('does not store a submission upload for a professor (role checked before multer)', async () => {
      const res = await request(app)
        .post('/api/atividades/1/submissoes')
        .set('Authorization', professor())
        .attach('arquivo', Buffer.from('<script>alert(1)</script>'), { filename: 'x.html', contentType: 'image/png' });
      expect(res.status).toBe(403);
    });

    it('serves non-media uploads as attachments and media inline', async () => {
      fs.mkdirSync('uploads', { recursive: true });
      const html = path.join('uploads', '__teste_seguranca__.html');
      const png = path.join('uploads', '__teste_seguranca__.png');
      fs.writeFileSync(html, '<script>alert(1)</script>');
      fs.writeFileSync(png, 'png');
      try {
        const resHtml = await request(app).get('/uploads/__teste_seguranca__.html');
        expect(resHtml.headers['content-disposition']).toBe('attachment');
        const resPng = await request(app).get('/uploads/__teste_seguranca__.png');
        expect(resPng.headers['content-disposition']).toBeUndefined();
      } finally {
        fs.rmSync(html, { force: true });
        fs.rmSync(png, { force: true });
      }
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
