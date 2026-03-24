import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  submissao: { findUnique: vi.fn(), update: vi.fn() },
  feedback: { create: vi.fn(), findMany: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import { createFeedback, getMyFeedbacks } from '../../../http/controllers/FeedbackController.js';
import { mockRes, mockReq, studentReq } from '../../helpers/mockReqRes.js';

describe('FeedbackController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createFeedback ────────────────────────────────────────────────────────
  describe('createFeedback', () => {
    it('returns 403 for aluno', async () => {
      await createFeedback(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid id', async () => {
      await createFeedback(mockReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when submission not found', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue(null);
      await createFeedback(mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when submission belongs to another professor\'s class', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, feedback: null, status: 'pendente',
        atividade: { turma: { professorId: 999 } },
      });
      await createFeedback(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when submission already has feedback', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, feedback: { id: 5 }, status: 'corrigido',
        atividade: { turma: { professorId: 1 } },
      });
      await createFeedback(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('feedback') }));
    });

    it('returns 400 when submission was already approved', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, feedback: null, status: 'aprovado',
        atividade: { turma: { professorId: 1 } },
      });
      await createFeedback(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates feedback and marks submission as corrigido', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, feedback: null, status: 'pendente',
        atividade: { turma: { professorId: 1 } },
      });
      const feedback = { id: 10, comentario: 'Good work', nota: 9.0 };
      prismaMock.feedback.create.mockResolvedValue(feedback);
      prismaMock.submissao.update.mockResolvedValue({});

      await createFeedback(mockReq({ params: { id: '1' }, body: { comentario: 'Good work', nota: '9.0' } }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(feedback);
      expect(prismaMock.submissao.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'corrigido' } })
      );
    });
  });

  // ── getMyFeedbacks ────────────────────────────────────────────────────────
  describe('getMyFeedbacks', () => {
    it('returns feedbacks for the authenticated student', async () => {
      const feedbacks = [{ id: 1, nota: 8.5, submissao: { atividade: { titulo: 'Task 1' } } }];
      prismaMock.feedback.findMany.mockResolvedValue(feedbacks);

      await getMyFeedbacks(studentReq(), res);

      expect(prismaMock.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { submissao: { alunoId: 10 } } })
      );
      expect(res.json).toHaveBeenCalledWith(feedbacks);
    });
  });
});
