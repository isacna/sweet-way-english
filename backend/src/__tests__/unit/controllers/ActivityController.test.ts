import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  turma: { findUnique: vi.fn(), findFirst: vi.fn() },
  atividade: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  matricula: { findFirst: vi.fn() },
  arquivo: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
const disco = vi.hoisted(() => ({ gravarNoDisco: vi.fn(), removerDoDisco: vi.fn() }));
vi.mock('../../../storage/arquivos.js', async (original) => ({
  ...(await original<typeof import('../../../storage/arquivos.js')>()),
  ...disco,
}));

import { createActivity, updateActivity, listActivitiesByClass } from '../../../http/controllers/ActivityController.js';
import { mockRes, mockReq, studentReq, executar } from '../../helpers/mockReqRes.js';
import { definirArquivoRecebido } from '../../../http/middlewares/upload.js';

const semArquivo = { arquivo: null, arquivoUrl: null };
const NOVO = '7f3c1d2e-0000-4000-8000-00000000000a';
const VELHO = '7f3c1d2e-0000-4000-8000-00000000000b';
const PDF = { buffer: Buffer.from('%PDF-1.4'), nomeOriginal: 'enunciado.pdf', mime: 'application/pdf', ext: 'pdf', tamanho: 8 };

describe('ActivityController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createActivity ────────────────────────────────────────────────────────
  describe('createActivity', () => {
    it('returns 400 for invalid turmaId', async () => {
      await executar(createActivity, mockReq({ params: { turmaId: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findFirst.mockResolvedValue(null);
      await executar(createActivity, mockReq({ params: { turmaId: '1' }, body: { titulo: 'T', descricao: 'D', dataEntrega: '2026-12-01' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('creates activity and returns 201', async () => {
      prismaMock.turma.findFirst.mockResolvedValue({ id: 1 });
      const atividade = { id: 5, titulo: 'Task 1' };
      prismaMock.atividade.create.mockResolvedValue(atividade);

      await executar(createActivity, mockReq({
        params: { turmaId: '1' },
        body: { titulo: 'Task 1', descricao: 'Do it', dataEntrega: '2026-12-31', arquivoObrigatorio: false },
      }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ...atividade, ...semArquivo });
      expect(prismaMock.atividade.create.mock.calls[0][0].data.arquivoObrigatorio).toBe(false);
    });

    it('multipart: "false" stays false and the optional attachment becomes an Arquivo of the teacher', async () => {
      prismaMock.turma.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      disco.gravarNoDisco.mockResolvedValue('n.pdf');
      prismaMock.arquivo.create.mockResolvedValue({ id: NOVO });
      prismaMock.atividade.create.mockResolvedValue({ id: 5, arquivoId: NOVO });

      const req = mockReq({
        params: { turmaId: '1' },
        body: { titulo: 'T', descricao: 'd', dataEntrega: '2026-12-31', arquivoObrigatorio: 'false' },
      });
      definirArquivoRecebido(req, PDF);
      await executar(createActivity, req, res);

      const data = prismaMock.atividade.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ arquivoObrigatorio: false, arquivoId: NOVO });
      expect(prismaMock.arquivo.create.mock.calls[0][0].data).toMatchObject({ donoId: 1, nomeOriginal: 'enunciado.pdf' });
      expect(res.json.mock.calls[0][0].arquivoUrl).toBe(`/api/arquivos/${NOVO}`);
    });

    it('with an attachment but another teacher class: 404 and nothing is written', async () => {
      prismaMock.turma.findFirst.mockResolvedValue(null);
      const req = mockReq({ params: { turmaId: '1' }, body: { titulo: 'T', descricao: 'D', dataEntrega: '2026-12-01' } });
      definirArquivoRecebido(req, PDF);
      await executar(createActivity, req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(disco.gravarNoDisco).not.toHaveBeenCalled();
    });
  });

  // ── updateActivity ────────────────────────────────────────────────────────
  describe('updateActivity', () => {
    it('returns 400 for invalid id', async () => {
      await executar(updateActivity, mockReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when activity not found', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue(null);
      await executar(updateActivity, mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when activity belongs to another professor', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 999 } });
      await executar(updateActivity, mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when no fields provided', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      await executar(updateActivity, mockReq({ params: { id: '1' }, body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for empty titulo', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      await executar(updateActivity, mockReq({ params: { id: '1' }, body: { titulo: '   ' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid date', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      await executar(updateActivity, mockReq({ params: { id: '1' }, body: { dataEntrega: 'not-a-date' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates activity and returns 200', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, turma: { professorId: 1 } });
      const updated = { id: 1, titulo: 'Updated' };
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.atividade.update.mockResolvedValue(updated);
      await executar(updateActivity, mockReq({ params: { id: '1' }, body: { titulo: 'Updated' } }), res);
      expect(res.json).toHaveBeenCalledWith({ ...updated, ...semArquivo });
    });

    it('a new attachment replaces the old one (old row and file removed after commit)', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, arquivoId: VELHO, turma: { professorId: 1 } });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      disco.gravarNoDisco.mockResolvedValue('n.pdf');
      prismaMock.arquivo.create.mockResolvedValue({ id: NOVO });
      prismaMock.atividade.update.mockResolvedValue({ id: 1, arquivoId: NOVO });
      prismaMock.arquivo.findMany.mockResolvedValueOnce([{ caminho: 'v.pdf' }]).mockResolvedValueOnce([]);

      const req = mockReq({ params: { id: '1' }, body: {} });
      definirArquivoRecebido(req, PDF);
      await executar(updateActivity, req, res);

      expect(prismaMock.atividade.update.mock.calls[0][0].data).toEqual({ arquivoId: NOVO });
      expect(prismaMock.arquivo.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [VELHO] } } });
      expect(disco.removerDoDisco).toHaveBeenCalledWith(['v.pdf']);
      expect(res.json.mock.calls[0][0].arquivoUrl).toBe(`/api/arquivos/${NOVO}`);
    });

    it('removerArquivo: true detaches and deletes the attachment', async () => {
      prismaMock.atividade.findUnique.mockResolvedValue({ id: 1, arquivoId: VELHO, turma: { professorId: 1 } });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.atividade.update.mockResolvedValue({ id: 1, arquivoId: null });
      prismaMock.arquivo.findMany.mockResolvedValueOnce([{ caminho: 'v.pdf' }]).mockResolvedValueOnce([]);

      await executar(updateActivity, mockReq({ params: { id: '1' }, body: { removerArquivo: true } }), res);

      expect(prismaMock.atividade.update.mock.calls[0][0].data).toEqual({ arquivoId: null });
      expect(disco.removerDoDisco).toHaveBeenCalledWith(['v.pdf']);
    });
  });

  // ── listActivitiesByClass ─────────────────────────────────────────────────
  describe('listActivitiesByClass', () => {
    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await executar(listActivitiesByClass, mockReq({ params: { turmaId: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when professor tries another professor\'s class', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await executar(listActivitiesByClass, mockReq({ params: { turmaId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when aluno is not enrolled', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await executar(listActivitiesByClass, studentReq({ params: { turmaId: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns activities for owning professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      const atividades = [{ id: 1, titulo: 'Task 1', arquivoId: null, submissoes: [{ id: 3, arquivoId: NOVO }] }];
      prismaMock.atividade.findMany.mockResolvedValue(atividades);
      await executar(listActivitiesByClass, mockReq({ params: { turmaId: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith([
        { ...atividades[0], ...semArquivo, submissoes: [{ id: 3, arquivoId: NOVO, arquivo: null, arquivoUrl: `/api/arquivos/${NOVO}` }] },
      ]);
    });

    it('returns activities for enrolled aluno', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      const atividades = [{ id: 1, titulo: 'Task 1', submissoes: [] }];
      prismaMock.atividade.findMany.mockResolvedValue(atividades);
      await executar(listActivitiesByClass, studentReq({ params: { turmaId: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith([{ ...atividades[0], ...semArquivo }]);
    });
  });
});
