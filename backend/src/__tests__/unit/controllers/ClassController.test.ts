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
import { mockRes, mockReq, studentReq, executar } from '../../helpers/mockReqRes.js';

describe('ClassController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── createClass ──────────────────────────────────────────────────────────
  describe('createClass', () => {
    it('creates class with a random 8-char invite code and returns 201', async () => {
      const turma = { id: 1, nome: 'English A1', codigoConvite: 'K7QM4TZP' };
      prismaMock.turma.create.mockResolvedValue(turma);

      await executar(createClass, mockReq({ body: { nome: 'English A1' } }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(turma);
      const codigo = prismaMock.turma.create.mock.calls[0][0].data.codigoConvite;
      expect(codigo).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
      expect(prismaMock.turma.count).not.toHaveBeenCalled();
    });

    it('ignores a legacy nivel field', async () => {
      prismaMock.turma.create.mockResolvedValue({ id: 1 });
      await executar(createClass, mockReq({ body: { nome: 'A1', nivel: 'B1/../x' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(prismaMock.turma.create.mock.calls[0][0].data).not.toHaveProperty('nivel');
    });

    it('returns 400 when the name is missing', async () => {
      await executar(createClass, mockReq({ body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Nome da turma é obrigatório' });
      expect(prismaMock.turma.create).not.toHaveBeenCalled();
    });

    it('tries another invite code when one is taken', async () => {
      const turma = { id: 2, nome: 'A1', codigoConvite: 'ABCDEFGH' };
      prismaMock.turma.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' })).mockResolvedValueOnce(turma);
      await executar(createClass, mockReq({ body: { nome: 'A1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(prismaMock.turma.create).toHaveBeenCalledTimes(2);
    });

    it('returns 500 on an unexpected DB error', async () => {
      prismaMock.turma.create.mockRejectedValue(new Error('db error'));
      await executar(createClass, mockReq({ body: { nome: 'A1' } }), res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── listClasses ───────────────────────────────────────────────────────────
  describe('listClasses', () => {
    it('returns professor own classes', async () => {
      const classes = [{ id: 1, nome: 'A1' }];
      prismaMock.turma.findMany.mockResolvedValue(classes);
      await executar(listClasses, mockReq(), res);
      expect(res.json).toHaveBeenCalledWith(classes);
    });

    it('returns enrolled classes for aluno', async () => {
      const turma = { id: 2, nome: 'B1' };
      prismaMock.matricula.findMany.mockResolvedValue([{ turma }]);
      await executar(listClasses, studentReq(), res);
      expect(res.json).toHaveBeenCalledWith([turma]);
    });
  });

  // ── getClassById ──────────────────────────────────────────────────────────
  describe('getClassById', () => {
    it('returns 404 when class not found', async () => {
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await executar(getClassById, mockReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when professor tries to access another professor\'s class', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 999, atividades: [], materiais: [], matriculas: [] });
      await executar(getClassById, mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns class data for owning professor', async () => {
      const turma = { id: 1, professorId: 1, professor: { nome: 'Ana' }, atividades: [], materiais: [], matriculas: [] };
      prismaMock.turma.findUnique.mockResolvedValue(turma);
      await executar(getClassById, mockReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(turma);
    });

    it('returns 403 when aluno is not enrolled', async () => {
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1, atividades: [], materiais: [], matriculas: [] });
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await executar(getClassById, studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns class for enrolled aluno', async () => {
      const turma = { id: 1, professorId: 1, atividades: [], materiais: [], matriculas: [] };
      prismaMock.turma.findUnique.mockResolvedValue(turma);
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      await executar(getClassById, studentReq({ params: { id: '1' } }), res);
      expect(res.json).toHaveBeenCalledWith(turma);
    });

    it("hides classmates' e-mails from students but not from the teacher", async () => {
      const emailSelecionado = () =>
        prismaMock.turma.findUnique.mock.calls.at(-1)![0].include.matriculas.include.aluno.select.email;
      prismaMock.turma.findUnique.mockResolvedValue({ id: 1, professorId: 1, matriculas: [] });
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      await executar(getClassById, studentReq({ params: { id: '1' } }), mockRes());
      expect(emailSelecionado()).toBe(false);
      await executar(getClassById, mockReq({ params: { id: '1' } }), mockRes());
      expect(emailSelecionado()).toBe(true);
    });
  });

  // ── joinClass ─────────────────────────────────────────────────────────────
  describe('joinClass', () => {
    it('returns 400 when aluno is already enrolled in any class', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 5 });
      await executar(joinClass, studentReq({ body: { codigoConvite: 'SWB1-2026' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when invite code is invalid', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      prismaMock.turma.findUnique.mockResolvedValue(null);
      await executar(joinClass, studentReq({ body: { codigoConvite: 'INVALID' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('enrolls aluno and returns 200', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      prismaMock.turma.findUnique.mockResolvedValue({ id: 3, codigoConvite: 'SWB1-2026' });
      prismaMock.matricula.create.mockResolvedValue({});
      await executar(joinClass, studentReq({ body: { codigoConvite: 'SWB1-2026' } }), res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Matriculado com sucesso' });
    });

    it('accepts the invite code in lowercase', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      prismaMock.turma.findUnique.mockResolvedValue({ id: 3 });
      prismaMock.matricula.create.mockResolvedValue({});
      await executar(joinClass, studentReq({ body: { codigoConvite: ' k7qm4tzp ' } }), res);
      expect(prismaMock.turma.findUnique).toHaveBeenCalledWith({ where: { codigoConvite: 'K7QM4TZP' } });
    });

    it('returns 400 if aluno is already in that specific class', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      prismaMock.turma.findUnique.mockResolvedValue({ id: 3 });
      prismaMock.matricula.create.mockRejectedValue(Object.assign(new Error('unique constraint'), { code: 'P2002' }));
      await executar(joinClass, studentReq({ body: { codigoConvite: 'SWB1-2026' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
