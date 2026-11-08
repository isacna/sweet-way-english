import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  turma: { findUnique: vi.fn() },
  materialApoio: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
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

import { createMaterial, deleteMaterial, listMaterialsByClass } from '../../../http/controllers/MaterialController.js';
import { mockRes, mockReq, studentReq, executar } from '../../helpers/mockReqRes.js';
import { definirArquivoRecebido } from '../../../http/middlewares/upload.js';

const ARQ_ID = '7f3c1d2e-0000-4000-8000-000000000002';

describe('MaterialController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createMaterial ────────────────────────────────────────────────────────
  describe('createMaterial', () => {
    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await executar(createMaterial, mockReq({ params: { id: '99' }, body: { titulo: 'X', tipo: 'link', url: 'https://x.com' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when turma belongs to another professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await executar(createMaterial, mockReq({ params: { id: '1' }, body: { titulo: 'X', tipo: 'link', url: 'https://x.com' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when titulo, tipo or url are missing', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      await executar(createMaterial, mockReq({ params: { id: '1' }, body: { titulo: 'PDF 1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for an unknown tipo', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      await executar(createMaterial, mockReq({ params: { id: '1' }, body: { titulo: 'X', tipo: 'planilha', url: 'https://x.com' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.materialApoio.create).not.toHaveBeenCalled();
    });

    it('creates material with URL and returns 201', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      const material = { id: 3, titulo: 'Grammar PDF', tipo: 'pdf', url: 'https://example.com/g.pdf', arquivoId: null };
      prismaMock.materialApoio.create.mockResolvedValue(material);

      await executar(createMaterial, mockReq({
        params: { id: '1' },
        body: { titulo: 'Grammar PDF', tipo: 'pdf', url: 'https://example.com/g.pdf' },
      }), res);

      expect(prismaMock.materialApoio.create.mock.calls[0][0].data).toEqual({
        titulo: 'Grammar PDF', tipo: 'pdf', turmaId: 1, url: 'https://example.com/g.pdf',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      // urlArquivo continua no contrato: para link é a própria URL
      expect(res.json).toHaveBeenCalledWith({ ...material, arquivo: null, urlArquivo: 'https://example.com/g.pdf' });
    });

    it('returns 400 for a link that is not http(s)', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      await executar(createMaterial, mockReq({ params: { id: '1' }, body: { titulo: 'X', tipo: 'link', url: 'javascript:alert(1)' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.materialApoio.create).not.toHaveBeenCalled();
    });

    it('creates material with uploaded file (Arquivo owned by the teacher) and returns 201', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      disco.gravarNoDisco.mockResolvedValue('x.mp3');
      prismaMock.arquivo.create.mockResolvedValue({ id: ARQ_ID });
      const arquivo = { id: ARQ_ID, nomeOriginal: 'file.mp3', mime: 'audio/mpeg', tamanho: 3 };
      prismaMock.materialApoio.create.mockResolvedValue({ id: 4, titulo: 'Audio', tipo: 'audio', url: null, arquivoId: ARQ_ID, arquivo });

      const req = mockReq({ params: { id: '1' }, body: { titulo: 'Audio', tipo: 'audio', url: 'https://ignorada' } });
      definirArquivoRecebido(req, { buffer: Buffer.from('ID3'), nomeOriginal: 'file.mp3', mime: 'audio/mpeg', ext: 'mp3', tamanho: 3 });
      await executar(createMaterial, req, res);

      expect(prismaMock.arquivo.create.mock.calls[0][0].data).toMatchObject({ donoId: 1, caminho: 'x.mp3', mime: 'audio/mpeg' });
      expect(prismaMock.materialApoio.create.mock.calls[0][0].data).toEqual({ titulo: 'Audio', tipo: 'audio', turmaId: 1, arquivoId: ARQ_ID });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0]).toMatchObject({ urlArquivo: `/api/arquivos/${ARQ_ID}`, arquivo });
    });

    it('with a file but a class of another teacher: 403 and nothing is written', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      const req = mockReq({ params: { id: '1' }, body: { titulo: 'Audio', tipo: 'audio' } });
      definirArquivoRecebido(req, { buffer: Buffer.from('ID3'), nomeOriginal: 'f.mp3', mime: 'audio/mpeg', ext: 'mp3', tamanho: 3 });
      await executar(createMaterial, req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(disco.gravarNoDisco).not.toHaveBeenCalled();
    });
  });

  // ── deleteMaterial ────────────────────────────────────────────────────────
  describe('deleteMaterial', () => {
    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await executar(deleteMaterial, mockReq({ params: { id: '99', materialId: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when turma belongs to another professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await executar(deleteMaterial, mockReq({ params: { id: '1', materialId: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 404 when material not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.materialApoio.findFirst.mockResolvedValue(null);
      await executar(deleteMaterial, mockReq({ params: { id: '1', materialId: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes material without upload file and returns 204', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.materialApoio.findFirst.mockResolvedValue({ id: 2, url: 'https://youtube.com/watch', arquivoId: null });
      prismaMock.materialApoio.delete.mockResolvedValue({});
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));

      await executar(deleteMaterial, mockReq({ params: { id: '1', materialId: '2' } }), res);

      expect(prismaMock.arquivo.deleteMany).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('deletes the Arquivo row and then the file on disk', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.materialApoio.findFirst.mockResolvedValue({ id: 2, url: null, arquivoId: ARQ_ID });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.arquivo.findMany
        .mockResolvedValueOnce([{ caminho: 'm.pdf' }]) // linhas apagadas
        .mockResolvedValueOnce([]); // ninguém mais usa o caminho

      await executar(deleteMaterial, mockReq({ params: { id: '1', materialId: '2' } }), res);

      expect(prismaMock.materialApoio.delete).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(prismaMock.arquivo.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [ARQ_ID] } } });
      expect(disco.removerDoDisco).toHaveBeenCalledWith(['m.pdf']);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('keeps a file on disk that another (migrated) Arquivo row still uses', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.materialApoio.findFirst.mockResolvedValue({ id: 2, url: null, arquivoId: ARQ_ID });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.arquivo.findMany
        .mockResolvedValueOnce([{ caminho: 'legado.pdf' }])
        .mockResolvedValueOnce([{ caminho: 'legado.pdf' }]);

      await executar(deleteMaterial, mockReq({ params: { id: '1', materialId: '2' } }), res);

      expect(disco.removerDoDisco).toHaveBeenCalledWith([]);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  // ── listMaterialsByClass ──────────────────────────────────────────────────
  describe('listMaterialsByClass', () => {
    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await executar(listMaterialsByClass, mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when professor tries another professor\'s class', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await executar(listMaterialsByClass, mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when aluno not enrolled', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await executar(listMaterialsByClass, studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns materials for owning professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      const arquivo = { id: ARQ_ID, nomeOriginal: 'a.pdf', mime: 'application/pdf', tamanho: 1 };
      const materials = [{ id: 1, titulo: 'PDF 1', tipo: 'pdf', url: null, arquivoId: ARQ_ID, arquivo }];
      prismaMock.materialApoio.findMany.mockResolvedValue(materials);
      await executar(listMaterialsByClass, mockReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith([{ ...materials[0], urlArquivo: `/api/arquivos/${ARQ_ID}` }]);
    });

    it('returns materials for enrolled aluno', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      const materials = [{ id: 2, titulo: 'Site', tipo: 'link', url: 'https://x.com', arquivoId: null }];
      prismaMock.materialApoio.findMany.mockResolvedValue(materials);
      await executar(listMaterialsByClass, studentReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith([{ ...materials[0], arquivo: null, urlArquivo: 'https://x.com' }]);
    });
  });
});
