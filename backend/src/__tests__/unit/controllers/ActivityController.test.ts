import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  turma: { findUnique: vi.fn(), findFirst: vi.fn() },
  atividade: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  matricula: { findFirst: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import { createActivity, updateActivity, listActivitiesByClass } from '../../../http/controllers/ActivityController.js';
import { mockRes, mockReq, studentReq } from '../../helpers/mockReqRes.js';

describe('ActivityController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createActivity ────────────────────────────────────────────────────────
  describe('createActivity', () => {
    it('returns 403 for aluno', async () => {
      await createActivity(studentReq({ params: { turmaId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid turmaId', async () => {
      await createActivity(mockReq({ params: { turmaId: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findFirst.mockResolvedValue(null);
      await createActivity(mockReq({ params: { turmaId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('creates activity and returns 201', async () => {
      prismaMock.turma.findFirst.mockResolvedValue({ id: 1 });
      const atividade = { id: 5, titulo: 'Task 1' };
      prismaMock.atividade.create.mockResolvedValue(atividade);

      await createActivity(mockReq({
        params: { turmaId: '1' },
        body: { titulo: 'Task 1', descricao: 'Do it', dataEntrega: '2026-12-31', arquivoObrigatorio: false },
      }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(atividade);
    });
  });

  // ── updateActivity ────────────────────────────────────────────────────────
  describe('updateActivity', () => {
    it('returns 403 for aluno', async () => {
      await updateActivity(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid id', async () => {
      await updateActivity(mockReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when activity not found', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue(null);
      await updateActivity(mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when activity belongs to another professor', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 999 } });
      await updateActivity(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when no fields provided', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      await updateActivity(mockReq({ params: { id: '1' }, body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for empty titulo', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      await updateActivity(mockReq({ params: { id: '1' }, body: { titulo: '   ' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid date', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      await updateActivity(mockReq({ params: { id: '1' }, body: { dataEntrega: 'not-a-date' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates activity and returns 200', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      const updated = { id: 1, titulo: 'Updated' };
      prismaMock.atividade.update.mockResolvedValue(updated);
      await updateActivity(mockReq({ params: { id: '1' }, body: { titulo: 'Updated' } }), res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  // ── listActivitiesByClass ─────────────────────────────────────────────────
  describe('listActivitiesByClass', () => {
    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await listActivitiesByClass(mockReq({ params: { turmaId: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when professor tries another professor\'s class', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await listActivitiesByClass(mockReq({ params: { turmaId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when aluno is not enrolled', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await listActivitiesByClass(studentReq({ params: { turmaId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns activities for owning professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      const atividades = [{ id: 1, titulo: 'Task 1', submissoes: [] }];
      prismaMock.atividade.findMany.mockResolvedValue(atividades);
      await listActivitiesByClass(mockReq({ params: { turmaId: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(atividades);
    });

    it('returns activities for enrolled aluno', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      const atividades = [{ id: 1, titulo: 'Task 1', submissoes: [] }];
      prismaMock.atividade.findMany.mockResolvedValue(atividades);
      await listActivitiesByClass(studentReq({ params: { turmaId: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(atividades);
    });
  });
});
