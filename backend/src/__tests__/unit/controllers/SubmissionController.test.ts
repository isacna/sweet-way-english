import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  atividade: { findUnique: vi.fn() },
  matricula: { findFirst: vi.fn() },
  submissao: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  feedback: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import { createSubmission, listSubmissionsByActivity, updateSubmissionStatus } from '../../../http/controllers/SubmissionController.js';
import { mockRes, mockReq, studentReq } from '../../helpers/mockReqRes.js';

describe('SubmissionController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createSubmission ──────────────────────────────────────────────────────
  describe('createSubmission', () => {
    it('returns 403 for professor', async () => {
      await createSubmission(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid activity id', async () => {
      await createSubmission(studentReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when activity not found', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue(null);
      await createSubmission(studentReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when aluno is not enrolled', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await createSubmission(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when file is required but not provided', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: true });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      await createSubmission(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('arquivo') }));
    });

    it('returns 400 when student already has a non-rejected submission', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue({ id: 5, status: 'pendente' });
      await createSubmission(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('allows resubmission when last submission was rejected', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue({ id: 5, status: 'reprovado' });
      const newSub = { id: 6, status: 'pendente' };
      prismaMock.submissao.create.mockResolvedValue(newSub);
      await createSubmission(studentReq({ params: { id: '1' }, body: { conteudo: 'My answer' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newSub);
    });

    it('creates first submission successfully', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue(null);
      const newSub = { id: 7, status: 'pendente' };
      prismaMock.submissao.create.mockResolvedValue(newSub);
      await createSubmission(studentReq({ params: { id: '1' }, body: { conteudo: 'Answer' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── listSubmissionsByActivity ─────────────────────────────────────────────
  describe('listSubmissionsByActivity', () => {
    it('returns 403 for aluno', async () => {
      await listSubmissionsByActivity(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid id', async () => {
      await listSubmissionsByActivity(mockReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when activity not found', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue(null);
      await listSubmissionsByActivity(mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when activity belongs to another professor', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 999 } });
      await listSubmissionsByActivity(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns submissions list', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      const subs = [{ id: 1, conteudo: 'Answer', aluno: { id: 10, nome: 'Bob' } }];
      prismaMock.submissao.findMany.mockResolvedValue(subs);
      await listSubmissionsByActivity(mockReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(subs);
    });
  });

  // ── updateSubmissionStatus ────────────────────────────────────────────────
  describe('updateSubmissionStatus', () => {
    it('returns 403 for aluno', async () => {
      await updateSubmissionStatus(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid id', async () => {
      await updateSubmissionStatus(mockReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid status value', async () => {
      await updateSubmissionStatus(mockReq({ params: { id: '1' }, body: { status: 'corrigido' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when submission not found', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue(null);
      await updateSubmissionStatus(mockReq({ params: { id: '99' }, body: { status: 'aprovado' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when submission was already evaluated', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'aprovado', atividade: { turma: { professorId: 1 } },
      });
      await updateSubmissionStatus(mockReq({ params: { id: '1' }, body: { status: 'reprovado' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when trying to approve a corrected submission', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'corrigido', atividade: { turma: { professorId: 1 } },
      });
      await updateSubmissionStatus(mockReq({ params: { id: '1' }, body: { status: 'aprovado' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('approves submission successfully', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'pendente', atividade: { turma: { professorId: 1 } },
      });
      const updated = { id: 1, status: 'aprovado' };
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.submissao.update.mockResolvedValue(updated);
      await updateSubmissionStatus(mockReq({ params: { id: '1' }, body: { status: 'aprovado' } }), res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('rejects submission and removes feedback', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'corrigido', atividade: { turma: { professorId: 1 } },
      });
      const updated = { id: 1, status: 'reprovado' };
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.feedback.deleteMany.mockResolvedValue({});
      prismaMock.submissao.update.mockResolvedValue(updated);
      await updateSubmissionStatus(mockReq({ params: { id: '1' }, body: { status: 'reprovado' } }), res);
      expect(prismaMock.feedback.deleteMany).toHaveBeenCalledWith({ where: { submissaoId: 1 } });
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });
});
