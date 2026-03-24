import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ── Prisma mock ──────────────────────────────────────────────────────────────
const prismaMock = vi.hoisted(() => ({
  professor: { findUnique: vi.fn(), create: vi.fn() },
  aluno: { findUnique: vi.fn(), create: vi.fn() },
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
import { router } from '../../http/routes/index.js';
import jwt from 'jsonwebtoken';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

// Helper: make JWT verify succeed with a given payload
function mockToken(payload: object) {
  (jwt.verify as any).mockImplementation((_t: any, _s: any, cb: any) => cb(null, payload));
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
    it('returns 201 on success', async () => {
      prismaMock.professor.create.mockResolvedValue({ id: 1 });
      const res = await request(app)
        .post('/api/auth/register/professor')
        .send({ nome: 'Ana', email: 'ana@t.com', senha: '123' });
      expect(res.status).toBe(201);
    });

    it('returns 400 on duplicate email', async () => {
      prismaMock.professor.create.mockRejectedValue(new Error('unique'));
      const res = await request(app)
        .post('/api/auth/register/professor')
        .send({ nome: 'Ana', email: 'dup@t.com', senha: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns token for valid credentials', async () => {
      const { default: bcrypt } = await import('bcryptjs');
      prismaMock.professor.findUnique.mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@t.com', senha: 'hashed' });
      (bcrypt.compare as any).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ana@t.com', senha: '123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ role: 'professor' });
    });

    it('returns 401 for wrong credentials', async () => {
      const { default: bcrypt } = await import('bcryptjs');
      prismaMock.professor.findUnique.mockResolvedValue(null);
      prismaMock.aluno.findUnique.mockResolvedValue(null);
      (bcrypt.compare as any).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'x@t.com', senha: 'wrong' });

      expect(res.status).toBe(401);
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
