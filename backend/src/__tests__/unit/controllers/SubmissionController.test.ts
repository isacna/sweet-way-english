import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  atividade: { findUnique: vi.fn() },
  matricula: { findFirst: vi.fn() },
  submissao: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  feedback: { deleteMany: vi.fn() },
  arquivo: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
const disco = vi.hoisted(() => ({ gravarNoDisco: vi.fn(), removerDoDisco: vi.fn() }));
vi.mock('../../../storage/arquivos.js', async (original) => ({
  ...(await original<typeof import('../../../storage/arquivos.js')>()),
  ...disco,
}));

import { createSubmission, listSubmissionsByActivity, updateSubmissionStatus } from '../../../http/controllers/SubmissionController.js';
import { mockRes, mockReq, studentReq, executar } from '../../helpers/mockReqRes.js';
import { definirArquivoRecebido } from '../../../http/middlewares/upload.js';

const semArquivo = { arquivo: null, arquivoUrl: null };
const PDF = { buffer: Buffer.from('%PDF-1.4'), nomeOriginal: 'tarefa.pdf', mime: 'application/pdf', ext: 'pdf', tamanho: 8 };

describe('SubmissionController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createSubmission ──────────────────────────────────────────────────────
  describe('createSubmission', () => {
    it('returns 400 for invalid activity id', async () => {
      await executar(createSubmission, studentReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when activity not found', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue(null);
      await executar(createSubmission, studentReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when aluno is not enrolled', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await executar(createSubmission, studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when file is required but not provided', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: true });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      await executar(createSubmission, studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('arquivo') }));
    });

    it('returns 400 when student already has a non-rejected submission', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue({ id: 5, status: 'pendente' });
      await executar(createSubmission, studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('allows resubmission when last submission was rejected', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue({ id: 5, status: 'reprovado' });
      const newSub = { id: 6, status: 'pendente' };
      prismaMock.submissao.create.mockResolvedValue(newSub);
      await executar(createSubmission, studentReq({ params: { id: '1' }, body: { conteudo: 'My answer' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ...newSub, ...semArquivo });
    });

    it('with a file: writes it only after the checks and links an Arquivo owned by the student', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: true });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue(null);
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      disco.gravarNoDisco.mockResolvedValue('aleatorio.pdf');
      const arq = { id: '7f3c1d2e-0000-4000-8000-000000000001' };
      prismaMock.arquivo.create.mockResolvedValue(arq);
      prismaMock.submissao.create.mockResolvedValue({ id: 9, arquivoId: arq.id, arquivo: { id: arq.id, nomeOriginal: 'tarefa.pdf', mime: 'application/pdf', tamanho: 8 } });

      const req = studentReq({ params: { id: '1' }, body: {} });
      definirArquivoRecebido(req, PDF);
      await executar(createSubmission, req, res);

      expect(disco.gravarNoDisco).toHaveBeenCalledWith(PDF.buffer, 'pdf');
      expect(prismaMock.arquivo.create).toHaveBeenCalledWith({
        data: { donoId: 10, nomeOriginal: 'tarefa.pdf', caminho: 'aleatorio.pdf', mime: 'application/pdf', tamanho: 8 },
      });
      expect(prismaMock.submissao.create.mock.calls[0][0].data).toMatchObject({ arquivoId: arq.id, alunoId: 10 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].arquivoUrl).toBe(`/api/arquivos/${arq.id}`);
      expect(disco.removerDoDisco).not.toHaveBeenCalled();
    });

    it('with a file but not enrolled: 403 and nothing is written', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      const req = studentReq({ params: { id: '1' } });
      definirArquivoRecebido(req, PDF);
      await executar(createSubmission, req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(disco.gravarNoDisco).not.toHaveBeenCalled();
    });

    it('removes the written file when the database transaction fails', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue(null);
      disco.gravarNoDisco.mockResolvedValue('aleatorio.pdf');
      prismaMock.$transaction.mockRejectedValue(new Error('db down'));
      const req = studentReq({ params: { id: '1' } });
      definirArquivoRecebido(req, PDF);
      await expect(createSubmission(req, res)).rejects.toThrow('db down');
      expect(disco.removerDoDisco).toHaveBeenCalledWith(['aleatorio.pdf']);
    });

    it('creates first submission successfully', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turmaId: 2, arquivoObrigatorio: false });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findFirst.mockResolvedValue(null);
      const newSub = { id: 7, status: 'pendente' };
      prismaMock.submissao.create.mockResolvedValue(newSub);
      await executar(createSubmission, studentReq({ params: { id: '1' }, body: { conteudo: 'Answer' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── listSubmissionsByActivity ─────────────────────────────────────────────
  describe('listSubmissionsByActivity', () => {
    it('returns 400 for invalid id', async () => {
      await executar(listSubmissionsByActivity, mockReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when activity not found', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue(null);
      await executar(listSubmissionsByActivity, mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when activity belongs to another professor', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 999 } });
      await executar(listSubmissionsByActivity, mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns submissions list', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      const subs = [{ id: 1, conteudo: 'Answer', aluno: { id: 10, nome: 'Bob' } }];
      prismaMock.submissao.findMany.mockResolvedValue(subs);
      await executar(listSubmissionsByActivity, mockReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith([{ ...subs[0], ...semArquivo }]);
    });
  });

  // ── updateSubmissionStatus ────────────────────────────────────────────────
  describe('updateSubmissionStatus', () => {
    it('returns 400 for invalid id', async () => {
      await executar(updateSubmissionStatus, mockReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid status value', async () => {
      await executar(updateSubmissionStatus, mockReq({ params: { id: '1' }, body: { status: 'corrigido' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when submission not found', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue(null);
      await executar(updateSubmissionStatus, mockReq({ params: { id: '99' }, body: { status: 'aprovado' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when submission was already evaluated', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'aprovado', atividade: { turma: { professorId: 1 } },
      });
      await executar(updateSubmissionStatus, mockReq({ params: { id: '1' }, body: { status: 'reprovado' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when trying to approve a corrected submission', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'corrigido', atividade: { turma: { professorId: 1 } },
      });
      await executar(updateSubmissionStatus, mockReq({ params: { id: '1' }, body: { status: 'aprovado' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('approves submission successfully', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'pendente', atividade: { turma: { professorId: 1 } },
      });
      const updated = { id: 1, status: 'aprovado' };
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.submissao.update.mockResolvedValue(updated);
      await executar(updateSubmissionStatus, mockReq({ params: { id: '1' }, body: { status: 'aprovado' } }), res);
      expect(res.json).toHaveBeenCalledWith({ ...updated, ...semArquivo });
    });

    it('rejects submission and removes feedback', async () => {
      prismaMock.submissao.findUnique.mockResolvedValue({
        id: 1, status: 'corrigido', atividade: { turma: { professorId: 1 } },
      });
      const updated = { id: 1, status: 'reprovado' };
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.feedback.deleteMany.mockResolvedValue({});
      prismaMock.submissao.update.mockResolvedValue(updated);
      await executar(updateSubmissionStatus, mockReq({ params: { id: '1' }, body: { status: 'reprovado' } }), res);
      expect(prismaMock.feedback.deleteMany).toHaveBeenCalledWith({ where: { submissaoId: 1 } });
      expect(res.json).toHaveBeenCalledWith({ ...updated, ...semArquivo });
    });
  });
});
