import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  nivel: { findMany: vi.fn() },
  progressoLicao: { findMany: vi.fn() },
  tentativaTeste: { findMany: vi.fn() },
  perfilAprendiz: { createMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  usuario: { findUnique: vi.fn() },
  certificado: { findMany: vi.fn(), createMany: vi.fn(), findUnique: vi.fn() },
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import {
  getConquistas,
  getCertificados,
  verificarCertificado,
  gerarCodigoCertificado,
} from '../../../http/controllers/ConquistasController.js';
import { studentReq, mockReq, mockRes, executar } from '../../helpers/mockReqRes.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// O banco só devolve módulos e lições publicados (filtro de carregarTrilha): um módulo fora da lista é um
// módulo não publicado.

const modulo = (id: number, licoes: number[]) => ({ id, ordem: id, licoes: licoes.map((l) => ({ id: l, ordem: l })) });
const A1 = { id: 1, codigo: 'A1', nome: 'Básico 1', ordem: 1, modulos: [modulo(1, [11, 12]), modulo(2, [21])] };
const A2 = { id: 2, codigo: 'A2', nome: 'Básico 2', ordem: 2, modulos: [modulo(3, [31])] };
const B1 = { id: 3, codigo: 'B1', nome: 'Intermediário', ordem: 3, modulos: [] };

const perfil = { usuarioId: 10, xp: 620, ofensivaAtual: 1, ofensivaMaxima: 4 };
const aprovada = (moduloId: number) => ({ moduloId, aprovado: true, percentual: 90, finalizadaEm: new Date('2026-11-01') });
const reprovada = (moduloId: number) => ({ moduloId, aprovado: false, percentual: 40, finalizadaEm: new Date('2026-10-01') });
const progresso = (licaoId: number, melhorPercentual = 90, concluida = true) => ({ licaoId, concluida, melhorPercentual });

function estado({ niveis = [A1, A2, B1] as object[], progressos = [] as object[], tentativas = [] as object[] } = {}) {
  prismaMock.nivel.findMany.mockResolvedValue(niveis);
  prismaMock.progressoLicao.findMany.mockResolvedValue(progressos);
  prismaMock.tentativaTeste.findMany.mockResolvedValue(tentativas);
}

const linhaCertificado = (nivelId: number, codigo = 'ABCDEFGHJKMN') => ({
  id: nivelId,
  codigo,
  usuarioId: 10,
  nivelId,
  nomeAluno: 'Ana Souza',
  emitidoEm: new Date('2026-11-10T12:00:00Z'),
});

describe('ConquistasController', () => {
  let res: any;

  beforeEach(() => {
    vi.resetAllMocks();
    res = mockRes();
    prismaMock.perfilAprendiz.createMany.mockResolvedValue({ count: 0 });
    prismaMock.perfilAprendiz.findUniqueOrThrow.mockResolvedValue(perfil);
    prismaMock.usuario.findUnique.mockResolvedValue({ nome: 'Ana Souza' });
    prismaMock.certificado.findMany.mockResolvedValue([]);
    prismaMock.certificado.createMany.mockResolvedValue({ count: 1 });
  });

  // ── GET /curso/conquistas ───────────────────────────────────────────────────
  describe('getConquistas', () => {
    const porId = () => Object.fromEntries(res.json.mock.calls[0][0].conquistas.map((c: any) => [c.id, c]));

    it('derives the list from profile, lessons and passed tests', async () => {
      estado({ progressos: [progresso(11, 100), progresso(12, 85)], tentativas: [reprovada(1), aprovada(1)] });

      await getConquistas(studentReq(), res);

      const c = porId();
      expect(c['primeira-licao'].obtida).toBe(true);
      expect(c['dez-licoes']).toMatchObject({ obtida: false, progresso: { atual: 2, alvo: 10 } });
      expect(c['quiz-perfeito'].obtida).toBe(true);
      expect(c['primeiro-modulo'].obtida).toBe(true);
      expect(c['ofensiva-3'].obtida).toBe(true);
      expect(c['ofensiva-7']).toMatchObject({ obtida: false, progresso: { atual: 4, alvo: 7 } });
      expect(c['xp-500'].obtida).toBe(true);
      expect(c['xp-2000'].obtida).toBe(false);
      expect(c['nivel-a1']).toMatchObject({ obtida: false, progresso: { atual: 1, alvo: 2 } });
      // A2 tem um módulo só (sem barra de progresso); B1 não tem módulo publicado e não aparece
      expect(c['nivel-a2'].obtida).toBe(false);
      expect(c['nivel-b1']).toBeUndefined();
      expect(prismaMock.perfilAprendiz.createMany).toHaveBeenCalledWith({ data: [{ usuarioId: 10 }], skipDuplicates: true });
    });

    it('ignores progress and tests of unpublished content', async () => {
      // Lição 99 e módulo 9 não vieram na trilha publicada; lição 12 foi tentada e não concluída
      estado({ progressos: [progresso(99, 100), progresso(12, 100, false)], tentativas: [aprovada(9)] });
      prismaMock.perfilAprendiz.findUniqueOrThrow.mockResolvedValue({ ...perfil, xp: 0, ofensivaMaxima: 0 });

      await getConquistas(studentReq(), res);

      expect(res.json.mock.calls[0][0].conquistas.filter((c: any) => c.obtida)).toEqual([]);
    });

    it('marks a level as complete when every published module is passed', async () => {
      estado({ tentativas: [aprovada(1), aprovada(2)] });
      await getConquistas(studentReq(), res);
      const c = porId();
      expect(c['nivel-a1']).toMatchObject({ obtida: true, progresso: { atual: 2, alvo: 2 } });
      expect(c['nivel-a2'].obtida).toBe(false);
    });
  });

  // ── GET /curso/certificados ─────────────────────────────────────────────────
  describe('getCertificados', () => {
    it('does not issue anything while the level is incomplete', async () => {
      estado({ tentativas: [aprovada(1), reprovada(2)] });

      await getCertificados(studentReq(), res);

      expect(prismaMock.certificado.createMany).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0]).toEqual({
        niveis: [
          { nivel: { id: 1, codigo: 'A1', nome: 'Básico 1' }, concluido: false, modulosAprovados: 1, totalModulos: 2, certificado: null },
          { nivel: { id: 2, codigo: 'A2', nome: 'Básico 2' }, concluido: false, modulosAprovados: 0, totalModulos: 1, certificado: null },
        ],
      });
    });

    it('issues the certificate the first time the level is complete', async () => {
      estado({ tentativas: [aprovada(1), aprovada(2)] });
      prismaMock.certificado.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([linhaCertificado(1)]);

      await getCertificados(studentReq(), res);

      expect(prismaMock.certificado.createMany).toHaveBeenCalledTimes(1);
      const { data, skipDuplicates } = prismaMock.certificado.createMany.mock.calls[0][0];
      expect(skipDuplicates).toBe(true);
      expect(data).toEqual([{ codigo: expect.stringMatching(/^[A-HJKMNP-Z2-9]{12}$/), usuarioId: 10, nivelId: 1, nomeAluno: 'Ana Souza' }]);

      const [a1, a2] = res.json.mock.calls[0][0].niveis;
      expect(a1).toMatchObject({
        concluido: true,
        certificado: { codigo: 'ABCDEFGHJKMN', emitidoEm: new Date('2026-11-10T12:00:00Z'), nomeAluno: 'Ana Souza' },
      });
      expect(Object.keys(a1.certificado)).toEqual(['codigo', 'emitidoEm', 'nomeAluno']);
      expect(a2).toMatchObject({ concluido: false, certificado: null });
    });

    it('returns the existing certificate without issuing again', async () => {
      estado({ tentativas: [aprovada(1), aprovada(2)] });
      prismaMock.certificado.findMany.mockResolvedValue([linhaCertificado(1)]);

      await getCertificados(studentReq(), res);

      expect(prismaMock.certificado.createMany).not.toHaveBeenCalled();
      expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].niveis[0].certificado.codigo).toBe('ABCDEFGHJKMN');
    });

    it('draws another code when the insert was skipped', async () => {
      estado({ tentativas: [aprovada(1), aprovada(2)] });
      prismaMock.certificado.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]) // código repetido: nada foi gravado
        .mockResolvedValueOnce([linhaCertificado(1)]);

      await getCertificados(studentReq(), res);

      expect(prismaMock.certificado.createMany).toHaveBeenCalledTimes(2);
      expect(res.json.mock.calls[0][0].niveis[0].certificado).not.toBeNull();
    });

    it('never completes a level whose modules are not published', async () => {
      // A1 sem módulo publicado: some da lista, mesmo com teste aprovado num módulo despublicado
      estado({ niveis: [{ ...A1, modulos: [] }, A2], tentativas: [aprovada(1), aprovada(2)] });

      await getCertificados(studentReq(), res);

      expect(prismaMock.certificado.createMany).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].niveis.map((n: any) => n.nivel.codigo)).toEqual(['A2']);
    });

    it('keeps an issued certificate when a new module is published later', async () => {
      estado({ tentativas: [aprovada(1)] }); // o módulo 2 foi publicado depois
      prismaMock.certificado.findMany.mockResolvedValue([linhaCertificado(1)]);

      await getCertificados(studentReq(), res);

      expect(res.json.mock.calls[0][0].niveis[0]).toMatchObject({ concluido: false, certificado: { codigo: 'ABCDEFGHJKMN' } });
    });
  });

  // ── GET /certificados/:codigo ───────────────────────────────────────────────
  describe('verificarCertificado', () => {
    const publico = { nomeAluno: 'Ana Souza', emitidoEm: new Date('2026-11-10T12:00:00Z'), nivel: { codigo: 'A1', nome: 'Básico 1' } };

    it('returns only name, level and date', async () => {
      prismaMock.certificado.findUnique.mockResolvedValue(publico);

      await executar(verificarCertificado as any, mockReq({ user: undefined, params: { codigo: 'ABCDEFGHJKMN' } }), res);

      expect(res.json).toHaveBeenCalledWith(publico);
      const consulta = prismaMock.certificado.findUnique.mock.calls[0][0];
      expect(consulta.where).toEqual({ codigo: 'ABCDEFGHJKMN' });
      expect(consulta.select).toEqual({ nomeAluno: true, emitidoEm: true, nivel: { select: { codigo: true, nome: true } } });
    });

    it('accepts the code as printed (lower case, grouped)', async () => {
      prismaMock.certificado.findUnique.mockResolvedValue(publico);
      await executar(verificarCertificado as any, mockReq({ params: { codigo: 'abcd-efgh-jkmn' } }), res);
      expect(prismaMock.certificado.findUnique.mock.calls[0][0].where).toEqual({ codigo: 'ABCDEFGHJKMN' });
    });

    it('returns 404 for an unknown code', async () => {
      prismaMock.certificado.findUnique.mockResolvedValue(null);
      await executar(verificarCertificado as any, mockReq({ params: { codigo: 'ZZZZZZZZZZZZ' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Certificado não encontrado' });
    });

    it.each(['abc', 'ABCDEFGHJKM0', 'ABCDEFGHJKMNP', "' OR 1=1 --"])('returns 404 without a query for %s', async (codigo) => {
      await executar(verificarCertificado as any, mockReq({ params: { codigo } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(prismaMock.certificado.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('gerarCodigoCertificado', () => {
    it('makes 12 unambiguous characters, different each time', () => {
      const codigos = new Set(Array.from({ length: 50 }, gerarCodigoCertificado));
      expect(codigos.size).toBe(50);
      for (const c of codigos) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{12}$/);
    });
  });
});
