import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  turma: { findUnique: vi.fn() },
  materialApoio: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
  matricula: { findFirst: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('fs', () => ({
  default: { existsSync: vi.fn().mockReturnValue(false), unlinkSync: vi.fn() },
  existsSync: vi.fn().mockReturnValue(false),
  unlinkSync: vi.fn(),
}));
vi.mock('path', () => ({
  default: { join: (...a: string[]) => a.join('/'), basename: (p: string) => p.split('/').pop()! },
  join: (...a: string[]) => a.join('/'),
  basename: (p: string) => p.split('/').pop()!,
}));

import { createMaterial, deleteMaterial, listMaterialsByClass } from '../../../http/controllers/MaterialController.js';
import { mockRes, mockReq, studentReq } from '../../helpers/mockReqRes.js';

describe('MaterialController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createMaterial ────────────────────────────────────────────────────────
  describe('createMaterial', () => {
    it('returns 403 for aluno', async () => {
      await createMaterial(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await createMaterial(mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when turma belongs to another professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await createMaterial(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when titulo, tipo or url are missing', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      await createMaterial(mockReq({ params: { id: '1' }, body: { titulo: 'PDF 1' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates material with URL and returns 201', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      const material = { id: 3, titulo: 'Grammar PDF', tipo: 'pdf', urlArquivo: 'https://example.com/g.pdf' };
      prismaMock.materialApoio.create.mockResolvedValue(material);

      await createMaterial(mockReq({
        params: { id: '1' },
        body: { titulo: 'Grammar PDF', tipo: 'pdf', url: 'https://example.com/g.pdf' },
      }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(material);
    });

    it('creates material with uploaded file and returns 201', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      const material = { id: 4, titulo: 'Audio', tipo: 'audio', urlArquivo: '/uploads/file.mp3' };
      prismaMock.materialApoio.create.mockResolvedValue(material);

      const req = mockReq({
        params: { id: '1' },
        body: { titulo: 'Audio', tipo: 'audio' },
        file: { filename: 'file.mp3' } as any,
      });
      await createMaterial(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── deleteMaterial ────────────────────────────────────────────────────────
  describe('deleteMaterial', () => {
    it('returns 403 for aluno', async () => {
      await deleteMaterial(studentReq({ params: { turmaId: '1', materialId: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await deleteMaterial(mockReq({ params: { turmaId: '99', materialId: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when turma belongs to another professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await deleteMaterial(mockReq({ params: { turmaId: '1', materialId: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 404 when material not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.materialApoio.findFirst.mockResolvedValue(null);
      await deleteMaterial(mockReq({ params: { turmaId: '1', materialId: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes material without upload file and returns 204', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.materialApoio.findFirst.mockResolvedValue({ id: 2, urlArquivo: 'https://youtube.com/watch' });
      prismaMock.materialApoio.delete.mockResolvedValue({});

      await deleteMaterial(mockReq({ params: { turmaId: '1', materialId: '2' } }), res);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  // ── listMaterialsByClass ──────────────────────────────────────────────────
  describe('listMaterialsByClass', () => {
    it('returns 404 when turma not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await listMaterialsByClass(mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when professor tries another professor\'s class', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999 });
      await listMaterialsByClass(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when aluno not enrolled', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await listMaterialsByClass(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns materials for owning professor', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      const materials = [{ id: 1, titulo: 'PDF 1', tipo: 'pdf' }];
      prismaMock.materialApoio.findMany.mockResolvedValue(materials);
      await listMaterialsByClass(mockReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(materials);
    });

    it('returns materials for enrolled aluno', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1 });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      const materials = [{ id: 2, titulo: 'Audio', tipo: 'audio' }];
      prismaMock.materialApoio.findMany.mockResolvedValue(materials);
      await listMaterialsByClass(studentReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(materials);
    });
  });
});
