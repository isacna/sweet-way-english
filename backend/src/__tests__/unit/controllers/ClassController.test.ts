import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  turma: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  matricula: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import { createClass, listClasses, getClassById, joinClass } from '../../../http/controllers/ClassController.js';
import { mockRes, mockReq, studentReq } from '../../helpers/mockReqRes.js';

describe('ClassController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createClass ──────────────────────────────────────────────────────────
  describe('createClass', () => {
    it('returns 403 for non-professor', async () => {
      await createClass(studentReq(), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('creates class and returns 201', async () => {
      prismaMock.turma.count.mockResolvedValue(5);
      const turma = { id: 1, nome: 'English A1', codigoConvite: 'SWB6-2026' };
      prismaMock.turma.create.mockResolvedValue(turma);

      await createClass(mockReq({ body: { nome: 'English A1', nivel: 'B' } }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(turma);
    });

    it('returns 400 on DB error', async () => {
      prismaMock.turma.count.mockResolvedValue(0);
      prismaMock.turma.create.mockRejectedValue(new Error('db error'));
      await createClass(mockReq({ body: { nome: 'A1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── listClasses ───────────────────────────────────────────────────────────
  describe('listClasses', () => {
    it('returns professor own classes', async () => {
      const classes = [{ id: 1, nome: 'A1' }];
      prismaMock.turma.findMany.mockResolvedValue(classes);
      await listClasses(mockReq(), res);
      expect(res.json).toHaveBeenCalledWith(classes);
    });

    it('returns enrolled classes for aluno', async () => {
      const turma = { id: 2, nome: 'B1' };
      prismaMock.matricula.findMany.mockResolvedValue([{ turma }]);
      await listClasses(studentReq(), res);
      expect(res.json).toHaveBeenCalledWith([turma]);
    });
  });

  // ── getClassById ──────────────────────────────────────────────────────────
  describe('getClassById', () => {
    it('returns 404 when class not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await getClassById(mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when professor tries to access another professor\'s class', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999, atividades: [], materiais: [], matriculas: [] });
      await getClassById(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns class data for owning professor', async () => {
      const turma = { id: 1, professorId: 1, professor: { nome: 'Ana' }, atividades: [], materiais: [], matriculas: [] };
      prismaMock.turma.findUnique.mockResolvedValue(turma);
      await getClassById(mockReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(turma);
    });

    it('returns 403 when aluno is not enrolled', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1, atividades: [], materiais: [], matriculas: [] });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await getClassById(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns class for enrolled aluno', async () => {
      const turma = { id: 1, professorId: 1, atividades: [], materiais: [], matriculas: [] };
      prismaMock.turma.findUnique.mockResolvedValue(turma);
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      await getClassById(studentReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(turma);
    });
  });

  // ── joinClass ─────────────────────────────────────────────────────────────
  describe('joinClass', () => {
    it('returns 403 for professor', async () => {
      await joinClass(mockReq({ body: { codigoConvite: 'SWB1-2026' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when aluno is already enrolled in any class', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 5 });
      await joinClass(studentReq({ body: { codigoConvite: 'SWB1-2026' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when invite code is invalid', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await joinClass(studentReq({ body: { codigoConvite: 'INVALID' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('enrolls aluno and returns 200', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      prismaMock.turma.findUnique.mockResolvedValue({ id: 3, codigoConvite: 'SWB1-2026' });
      prismaMock.matricula.create.mockResolvedValue({});
      await joinClass(studentReq({ body: { codigoConvite: 'SWB1-2026' } }), res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Matriculado com sucesso' });
    });

    it('returns 400 if aluno is already in that specific class', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      prismaMock.turma.findUnique.mockResolvedValue({ id: 3 });
      prismaMock.matricula.create.mockRejectedValue(new Error('unique constraint'));
      await joinClass(studentReq({ body: { codigoConvite: 'SWB1-2026' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
