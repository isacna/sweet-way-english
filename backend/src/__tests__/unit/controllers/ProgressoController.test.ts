import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  turma: { findFirst: vi.fn() },
  modulo: { findMany: vi.fn() },
  matricula: { findMany: vi.fn() },
  usuario: { findMany: vi.fn() },
  perfilAprendiz: { findMany: vi.fn() },
  progressoLicao: { findMany: vi.fn() },
  tentativaTeste: { findMany: vi.fn() },
  revisaoItem: { findMany: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import { progressoAlunos } from '../../../http/controllers/ProgressoController.js';
import { mockReq, mockRes } from '../../helpers/mockReqRes.js';

describe('ProgressoController.progressoAlunos', () => {
  let res: any;

  beforeEach(() => {
    vi.resetAllMocks();
    res = mockRes();
    prismaMock.modulo.findMany.mockResolvedValue([
      { id: 1, slug: 'a1-m01', ordem: 1, titulo: 'M1', _count: { licoes: 6 } },
      { id: 2, slug: 'a1-m02', ordem: 2, titulo: 'M2', _count: { licoes: 5 } },
    ]);
  });

  it('returns 400 for an invalid turmaId', async () => {
    await progressoAlunos(mockReq({ query: { turmaId: 'abc' } as any }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when the class is not the professor’s', async () => {
    prismaMock.turma.findFirst.mockResolvedValue(null);
    await progressoAlunos(mockReq({ query: { turmaId: '5' } as any }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(prismaMock.turma.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5, professorId: 1 } }));
  });

  it('returns empty students without querying progress', async () => {
    prismaMock.matricula.findMany.mockResolvedValue([]);
    await progressoAlunos(mockReq(), res);
    expect(res.json.mock.calls[0][0]).toEqual({
      modulos: [
        { id: 1, slug: 'a1-m01', ordem: 1, titulo: 'M1', totalLicoes: 6 },
        { id: 2, slug: 'a1-m02', ordem: 2, titulo: 'M2', totalLicoes: 5 },
      ],
      alunos: [],
    });
    expect(prismaMock.perfilAprendiz.findMany).not.toHaveBeenCalled();
  });

  it('aggregates progress per student and module', async () => {
    prismaMock.turma.findFirst.mockResolvedValue({ id: 3 });
    prismaMock.matricula.findMany.mockResolvedValue([
      { aluno: { id: 20, nome: 'Bruno', email: 'b@t.com' }, turma: { id: 3, nome: 'T3' } },
      { aluno: { id: 10, nome: 'Ana', email: 'a@t.com' }, turma: { id: 3, nome: 'T3' } },
    ]);
    prismaMock.perfilAprendiz.findMany.mockResolvedValue([
      { usuarioId: 10, xp: 150, ofensivaAtual: 4, ultimoEstudoEm: new Date() },
    ]);
    prismaMock.progressoLicao.findMany.mockResolvedValue([
      { usuarioId: 10, licao: { moduloId: 1 } },
      { usuarioId: 10, licao: { moduloId: 1 } },
      { usuarioId: 10, licao: { moduloId: 2 } },
    ]);
    prismaMock.tentativaTeste.findMany.mockResolvedValue([
      { usuarioId: 10, moduloId: 1, aprovado: false, percentual: 60 },
      { usuarioId: 10, moduloId: 1, aprovado: true, percentual: 85 },
    ]);
    prismaMock.revisaoItem.findMany.mockResolvedValue([{ usuarioId: 10 }, { usuarioId: 10 }]);

    await progressoAlunos(mockReq({ query: { turmaId: '3' } as any }), res);

    const { alunos } = res.json.mock.calls[0][0];
    expect(alunos.map((a: any) => a.nome)).toEqual(['Ana', 'Bruno']);
    expect(alunos[0]).toMatchObject({ id: 10, xp: 150, ofensivaAtual: 4, revisoesPendentes: 2, turmas: [{ id: 3, nome: 'T3' }] });
    expect(alunos[0].modulos).toEqual([
      { moduloId: 1, licoesConcluidas: 2, testeAprovado: true, melhorPercentualTeste: 85, tentativasTeste: 2 },
      { moduloId: 2, licoesConcluidas: 1, testeAprovado: false, melhorPercentualTeste: null, tentativasTeste: 0 },
    ]);
    expect(alunos[1]).toMatchObject({ id: 20, xp: 0, ofensivaAtual: 0, ultimoEstudoEm: null, revisoesPendentes: 0 });
    expect(prismaMock.matricula.findMany.mock.calls[0][0].where.turma).toEqual({ professorId: 1, id: 3 });
  });

  it('lists students without any class for ?turmaId=sem-turma', async () => {
    prismaMock.usuario.findMany.mockResolvedValue([{ id: 30, nome: 'Davi', email: 'd@t.com' }]);
    prismaMock.perfilAprendiz.findMany.mockResolvedValue([{ usuarioId: 30, xp: 40, ofensivaAtual: 0, ultimoEstudoEm: null }]);
    prismaMock.progressoLicao.findMany.mockResolvedValue([{ usuarioId: 30, licao: { moduloId: 1 } }]);
    prismaMock.tentativaTeste.findMany.mockResolvedValue([]);
    prismaMock.revisaoItem.findMany.mockResolvedValue([]);

    await progressoAlunos(mockReq({ query: { turmaId: 'sem-turma' } as any }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(prismaMock.turma.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.matricula.findMany).not.toHaveBeenCalled();
    expect(prismaMock.usuario.findMany.mock.calls[0][0].where).toEqual({ papel: 'aluno', matriculas: { none: {} } });
    const { alunos } = res.json.mock.calls[0][0];
    expect(alunos).toHaveLength(1);
    expect(alunos[0]).toMatchObject({ id: 30, nome: 'Davi', xp: 40, turmas: [] });
    expect(alunos[0].modulos[0]).toMatchObject({ moduloId: 1, licoesConcluidas: 1 });
  });
});
