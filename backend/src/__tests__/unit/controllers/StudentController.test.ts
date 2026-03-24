import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  turma: { findFirst: vi.fn() },
  matricula: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  aluno: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  submissao: { findMany: vi.fn(), deleteMany: vi.fn() },
  feedback: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed') },
}));
vi.mock('fs', () => ({
  default: { existsSync: vi.fn().mockReturnValue(false), unlinkSync: vi.fn() },
  existsSync: vi.fn().mockReturnValue(false),
  unlinkSync: vi.fn(),
}));

import bcrypt from 'bcryptjs';
import { listStudents, createStudent, updateStudent, deleteStudent } from '../../../http/controllers/StudentController.js';
import { mockRes, mockReq, studentReq } from '../../helpers/mockReqRes.js';

const professorReq = (overrides = {}) => mockReq(overrides);

describe('StudentController', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    vi.clearAllMocks();
  });

  // ── listStudents ──────────────────────────────────────────────────────────
  describe('listStudents', () => {
    it('returns 403 for aluno', async () => {
      await listStudents(studentReq(), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns sorted list of students with their classes', async () => {
      const matriculaMock = {
        aluno: { id: 2, nome: 'Carlos', email: 'c@t.com', criadoEm: new Date() },
        turma: { id: 1, nome: 'A1' },
      };
      prismaMock.matricula.findMany.mockResolvedValue([matriculaMock]);

      await listStudents(professorReq(), res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ nome: 'Carlos' })])
      );
    });
  });

  // ── createStudent ─────────────────────────────────────────────────────────
  describe('createStudent', () => {
    it('returns 403 for aluno', async () => {
      await createStudent(studentReq(), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when required fields are missing', async () => {
      await createStudent(professorReq({ body: { nome: 'Bob' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when turmaId is not a number', async () => {
      await createStudent(professorReq({ body: { nome: 'Bob', email: 'b@t.com', senha: '123', turmaId: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when turma does not belong to professor', async () => {
      prismaMock.turma.findFirst.mockResolvedValue(null);
      await createStudent(professorReq({ body: { nome: 'Bob', email: 'b@t.com', senha: '123', turmaId: 5 } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates student and returns 201', async () => {
      prismaMock.turma.findFirst.mockResolvedValue({ id: 1 });
      const aluno = { id: 3, nome: 'Bob', email: 'b@t.com' };
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.aluno.create.mockResolvedValue(aluno);
      prismaMock.matricula.create.mockResolvedValue({});

      await createStudent(professorReq({ body: { nome: 'Bob', email: 'b@t.com', senha: '123', turmaId: 1 } }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        aluno: expect.objectContaining({ nome: 'Bob' }),
      }));
    });

    it('returns 400 on duplicate email', async () => {
      prismaMock.turma.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.$transaction.mockRejectedValue(new Error('unique'));
      await createStudent(professorReq({ body: { nome: 'Bob', email: 'dup@t.com', senha: '123', turmaId: 1 } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── updateStudent ─────────────────────────────────────────────────────────
  describe('updateStudent', () => {
    it('returns 403 for aluno', async () => {
      await updateStudent(studentReq({ params: { id: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid id', async () => {
      await updateStudent(professorReq({ params: { id: 'abc' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when student not linked to professor', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await updateStudent(professorReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when no fields sent', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      await updateStudent(professorReq({ params: { id: '2' }, body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates student name and returns 200', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      const updated = { id: 2, nome: 'New Name', email: 'b@t.com', criadoEm: new Date() };
      prismaMock.aluno.update.mockResolvedValue(updated);
      await updateStudent(professorReq({ params: { id: '2' }, body: { nome: 'New Name' } }), res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('hashes password when senha is provided', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.aluno.update.mockResolvedValue({ id: 2, nome: 'Bob', email: 'b@t.com', criadoEm: new Date() });
      await updateStudent(professorReq({ params: { id: '2' }, body: { senha: 'newpass' } }), res);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
    });
  });

  // ── deleteStudent ─────────────────────────────────────────────────────────
  describe('deleteStudent', () => {
    it('returns 403 for aluno', async () => {
      await deleteStudent(studentReq({ params: { id: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 for invalid id', async () => {
      await deleteStudent(professorReq({ params: { id: 'xyz' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when student not linked to professor', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue(null);
      await deleteStudent(professorReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes student and returns 204', async () => {
      prismaMock.matricula.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.submissao.findMany.mockResolvedValue([]);
      prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
      prismaMock.feedback.deleteMany.mockResolvedValue({});
      prismaMock.submissao.deleteMany.mockResolvedValue({});
      prismaMock.matricula.deleteMany.mockResolvedValue({});
      prismaMock.aluno.delete.mockResolvedValue({});

      await deleteStudent(professorReq({ params: { id: '2' } }), res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});
