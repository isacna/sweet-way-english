import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  nivel: { findMany: vi.fn() },
  licao: { findUnique: vi.fn() },
  notaLicao: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  exercicio: { findUnique: vi.fn(), findMany: vi.fn() },
  itemTeste: { findMany: vi.fn() },
  progressoLicao: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  perfilAprendiz: { createMany: vi.fn(), findUniqueOrThrow: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  revisaoItem: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  tentativaTeste: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import {
  getTrilha,
  getLicao,
  salvarNota,
  verificarExercicio,
  enviarQuiz,
  listarRevisao,
  responderRevisao,
  iniciarTeste,
  finalizarTentativa,
  atualizarPerfil,
} from '../../../http/controllers/CursoController.js';
import { studentReq, mockRes } from '../../helpers/mockReqRes.js';
import { XP } from '../../../domain/progresso.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const licao = (id: number, ordem: number) => ({ id, ordem, titulo: `L${id}`, objetivo: 'obj', minutosEstimados: 15 });
const modulo = (id: number, ordem: number, licoes: ReturnType<typeof licao>[]) => ({
  id,
  slug: `a1-m0${ordem}`,
  ordem,
  titulo: `M${id}`,
  tema: 'tema',
  descricao: 'desc',
  canDos: ['can 1', 'can 2'],
  gramatica: 'g',
  vocabulario: 'v',
  funcao: 'f',
  licoes,
});
const NIVEIS = [
  {
    id: 1,
    codigo: 'A1',
    nome: 'Iniciante',
    descricao: null,
    ordem: 1,
    modulos: [modulo(1, 1, [licao(11, 1), licao(12, 2)]), modulo(2, 2, [licao(21, 1)])],
  },
  { id: 2, codigo: 'A2', nome: 'Básico', descricao: null, ordem: 2, modulos: [] },
];

const mcq = (id: number, etapa: string, licaoId = 11) => ({
  id,
  licaoId,
  ordem: id,
  etapa,
  tipo: 'mcq',
  enunciado: 'Escolha',
  conteudo: { opcoes: ['am', 'is'] },
  gabarito: { correta: 0 },
  explicacao: 'Use am com I',
  tagsErro: ['verbo_be'],
});

const itemTeste = (id: number, habilidade: string, forma = 1) => ({
  id,
  moduloId: 1,
  forma,
  ordem: id,
  habilidade,
  tipo: 'mcq',
  enunciado: 'Escolha',
  conteudo: { opcoes: ['am', 'is'] },
  gabarito: { correta: 0 },
  explicacao: 'exp',
});

const perfil = { usuarioId: 10, xp: 40, ofensivaAtual: 2, ofensivaMaxima: 3, ultimoEstudoEm: new Date(), metodologia: 'gramatica', metaDiariaXp: 30, xpDoDia: 12, onboardingEm: null as Date | null, lembretesEmail: false };

/** Estado do aluno: lições concluídas e tentativas finalizadas. */
function estado({ concluidas = [] as number[], tentativas = [] as object[] } = {}) {
  prismaMock.nivel.findMany.mockResolvedValue(NIVEIS);
  prismaMock.progressoLicao.findMany.mockResolvedValue(
    concluidas.map((licaoId) => ({ licaoId, concluida: true, melhorPercentual: 90, tentativas: 1 })),
  );
  prismaMock.tentativaTeste.findMany.mockResolvedValue(tentativas);
}

const lessonRow = (id: number, moduloId = 1) => ({
  id,
  moduloId,
  slug: `l${id}`,
  ordem: 1,
  titulo: `L${id}`,
  objetivo: 'obj',
  minutosEstimados: 15,
  apresentacao: { explicacao: ['x'], exemplos: [] },
  modulo: { id: moduloId, slug: 'a1-m01', titulo: 'M1', ordem: 1 },
});

describe('CursoController', () => {
  let res: any;

  beforeEach(() => {
    vi.resetAllMocks();
    res = mockRes();
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
    prismaMock.perfilAprendiz.createMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.perfilAprendiz.findUniqueOrThrow.mockResolvedValue(perfil);
    prismaMock.perfilAprendiz.upsert.mockResolvedValue(perfil);
    prismaMock.perfilAprendiz.update.mockResolvedValue(perfil);
    prismaMock.revisaoItem.count.mockResolvedValue(0);
  });

  // ── GET /curso ──────────────────────────────────────────────────────────────
  describe('getTrilha', () => {
    it('returns profile and unlock state, hiding empty levels', async () => {
      estado({ concluidas: [11] });
      prismaMock.revisaoItem.count.mockResolvedValue(3);

      await getTrilha(studentReq(), res);

      const body = res.json.mock.calls[0][0];
      expect(body.perfil).toEqual({
        xp: 40,
        ofensivaAtual: 2,
        ofensivaMaxima: 3,
        metodologia: 'gramatica',
        revisoesPendentes: 3,
        metaDiariaXp: 30,
        xpHoje: 12,
        onboardingPendente: true,
        lembretesEmail: false,
      });
      expect(body.niveis).toHaveLength(1);
      const [m1, m2] = body.niveis[0].modulos;
      expect(m1).toMatchObject({ desbloqueado: true, licoesConcluidas: 1, totalLicoes: 2, canDos: ['can 1', 'can 2'] });
      expect(m1.teste).toEqual({ disponivel: false, podeAdiantar: true, aprovado: false, melhorPercentual: null, tentativas: 0, bloqueadoAte: null });
      expect(m1.licoes[0]).toMatchObject({ id: 11, concluida: true, desbloqueada: true, melhorPercentual: 90 });
      expect(m1.licoes[1]).toMatchObject({ id: 12, concluida: false, desbloqueada: true, melhorPercentual: 0 });
      expect(m2.desbloqueado).toBe(false);
      expect(m2.teste.podeAdiantar).toBe(false);
      expect(prismaMock.perfilAprendiz.createMany).toHaveBeenCalledWith({ data: [{ usuarioId: 10 }], skipDuplicates: true });
    });

    it('after a test-out: module passed, its lessons open but not completed, next module unlocked', async () => {
      estado({ tentativas: [{ moduloId: 1, aprovado: true, percentual: 88, finalizadaEm: new Date() }] });

      await getTrilha(studentReq(), res);

      const [m1, m2] = res.json.mock.calls[0][0].niveis[0].modulos;
      expect(m1).toMatchObject({ desbloqueado: true, licoesConcluidas: 0, totalLicoes: 2 });
      expect(m1.teste).toMatchObject({ aprovado: true, disponivel: false, podeAdiantar: false, melhorPercentual: 88 });
      expect(m1.licoes.map((l: any) => [l.desbloqueada, l.concluida])).toEqual([[true, false], [true, false]]);
      expect(m2.desbloqueado).toBe(true);
      expect(m2.teste).toMatchObject({ disponivel: false, podeAdiantar: true });
    });

    it('does not offer the test-out during the wait after a failure', async () => {
      estado({ tentativas: [{ moduloId: 1, aprovado: false, percentual: 40, finalizadaEm: new Date() }] });
      await getTrilha(studentReq(), res);
      const [m1] = res.json.mock.calls[0][0].niveis[0].modulos;
      expect(m1.teste).toMatchObject({ disponivel: false, podeAdiantar: false, bloqueadoAte: expect.any(String) });
    });

    it('reports a broken streak as 0', async () => {
      estado();
      prismaMock.perfilAprendiz.findUniqueOrThrow.mockResolvedValue({ ...perfil, ultimoEstudoEm: new Date('2020-01-01') });
      await getTrilha(studentReq(), res);
      expect(res.json.mock.calls[0][0].perfil.ofensivaAtual).toBe(0);
    });
  });

  // ── GET /curso/licoes/:id ───────────────────────────────────────────────────
  describe('getLicao', () => {
    it('returns 404 for an unpublished lesson', async () => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(99));
      await getLicao(studentReq({ params: { id: '99' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when the lesson does not exist', async () => {
      prismaMock.licao.findUnique.mockResolvedValue(null);
      await getLicao(studentReq({ params: { id: '5' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 for a locked lesson', async () => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(12));
      await getLicao(studentReq({ params: { id: '12' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns the lesson without answer keys', async () => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(11));
      prismaMock.exercicio.findMany.mockResolvedValue([mcq(1, 'controlada'), mcq(2, 'quiz')]);

      await getLicao(studentReq({ params: { id: '11' } }), res);

      const body = res.json.mock.calls[0][0];
      expect(body).toMatchObject({ id: 11, proximaLicaoId: 12, progresso: { concluida: false, melhorPercentual: 0, tentativas: 0 } });
      expect(body.exercicios[0]).toEqual({ id: 1, ordem: 1, etapa: 'controlada', tipo: 'mcq', enunciado: 'Escolha', conteudo: { opcoes: ['am', 'is'] } });
      expect(JSON.stringify(body)).not.toMatch(/gabarito|explicacao.*Use am|tagsErro|correta/);
      expect(body.nota).toBeNull();
    });

    it("includes the student's own note", async () => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(11));
      prismaMock.exercicio.findMany.mockResolvedValue([]);
      const atualizadoEm = new Date('2026-11-04T12:00:00Z');
      prismaMock.notaLicao.findUnique.mockResolvedValue({ texto: 'am com I', atualizadoEm });

      await getLicao(studentReq({ params: { id: '11' } }), res);

      expect(res.json.mock.calls[0][0].nota).toEqual({ texto: 'am com I', atualizadoEm });
      expect(prismaMock.notaLicao.findUnique).toHaveBeenCalledWith({
        where: { usuarioId_licaoId: { usuarioId: 10, licaoId: 11 } },
      });
    });
  });

  // ── PUT /curso/licoes/:id/nota ──────────────────────────────────────────────
  describe('salvarNota', () => {
    it('rejects a note over the size limit', async () => {
      await salvarNota(studentReq({ params: { id: '11' }, body: { texto: 'a'.repeat(5001) } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.notaLicao.upsert).not.toHaveBeenCalled();
    });

    it('returns 403 for a locked lesson', async () => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(12));
      await salvarNota(studentReq({ params: { id: '12' }, body: { texto: 'oi' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(prismaMock.notaLicao.upsert).not.toHaveBeenCalled();
    });

    it("upserts the student's note", async () => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(11));
      const atualizadoEm = new Date();
      prismaMock.notaLicao.upsert.mockResolvedValue({ texto: 'Good night = só na despedida', atualizadoEm });

      await salvarNota(studentReq({ params: { id: '11' }, body: { texto: 'Good night = só na despedida' } }), res);

      expect(prismaMock.notaLicao.upsert).toHaveBeenCalledWith({
        where: { usuarioId_licaoId: { usuarioId: 10, licaoId: 11 } },
        update: { texto: 'Good night = só na despedida' },
        create: { usuarioId: 10, licaoId: 11, texto: 'Good night = só na despedida' },
      });
      expect(res.json).toHaveBeenCalledWith({ nota: { texto: 'Good night = só na despedida', atualizadoEm } });
    });

    it('deletes the note when the text is blank', async () => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(11));
      await salvarNota(studentReq({ params: { id: '11' }, body: { texto: '   ' } }), res);
      expect(prismaMock.notaLicao.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 10, licaoId: 11 } });
      expect(res.json).toHaveBeenCalledWith({ nota: null });
    });
  });

  // ── POST /curso/exercicios/:id/verificar ────────────────────────────────────
  describe('verificarExercicio', () => {
    beforeEach(() => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(11));
    });

    it('returns 400 for a quiz item', async () => {
      prismaMock.exercicio.findUnique.mockResolvedValue(mcq(2, 'quiz'));
      await verificarExercicio(studentReq({ params: { id: '2' }, body: { resposta: 0 } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when the body has no answer', async () => {
      await verificarExercicio(studentReq({ params: { id: '1' }, body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for an answer in the wrong format', async () => {
      prismaMock.exercicio.findUnique.mockResolvedValue(mcq(1, 'controlada'));
      await verificarExercicio(studentReq({ params: { id: '1' }, body: { resposta: 'am' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 403 when the lesson is locked', async () => {
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(12));
      prismaMock.exercicio.findUnique.mockResolvedValue(mcq(5, 'controlada', 12));
      await verificarExercicio(studentReq({ params: { id: '5' }, body: { resposta: 0 } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('corrects a right answer, updates the streak and gives no XP', async () => {
      prismaMock.exercicio.findUnique.mockResolvedValue(mcq(1, 'controlada'));
      await verificarExercicio(studentReq({ params: { id: '1' }, body: { resposta: 0 } }), res);
      expect(res.json).toHaveBeenCalledWith({ correto: true, pontuacao: 1, respostaEsperada: 'am', explicacao: 'Use am com I' });
      expect(prismaMock.revisaoItem.create).not.toHaveBeenCalled();
      expect(prismaMock.perfilAprendiz.update.mock.calls[0][0].data.xp).toEqual({ increment: 0 });
    });

    it('puts a wrong answer into review (new item)', async () => {
      prismaMock.exercicio.findUnique.mockResolvedValue(mcq(1, 'controlada'));
      prismaMock.revisaoItem.findUnique.mockResolvedValue(null);
      await verificarExercicio(studentReq({ params: { id: '1' }, body: { resposta: 1 } }), res);
      expect(res.json.mock.calls[0][0].correto).toBe(false);
      expect(prismaMock.revisaoItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ usuarioId: 10, exercicioId: 1, caixa: 1 }),
      });
    });

    it('sends an existing review item back to box 1', async () => {
      prismaMock.exercicio.findUnique.mockResolvedValue(mcq(1, 'controlada'));
      prismaMock.revisaoItem.findUnique.mockResolvedValue({ id: 7, caixa: 4, proximaEm: new Date('2099-01-01') });
      await verificarExercicio(studentReq({ params: { id: '1' }, body: { resposta: 1 } }), res);
      const data = prismaMock.revisaoItem.update.mock.calls[0][0].data;
      expect(data.caixa).toBe(1);
      expect(data.proximaEm.getTime()).toBeLessThan(new Date('2099-01-01').getTime());
    });
  });

  // ── POST /curso/licoes/:id/quiz ─────────────────────────────────────────────
  describe('enviarQuiz', () => {
    const quiz = [mcq(1, 'quiz'), mcq(2, 'quiz'), mcq(3, 'quiz'), mcq(4, 'quiz'), mcq(5, 'quiz')];

    beforeEach(() => {
      estado();
      prismaMock.licao.findUnique.mockResolvedValue(lessonRow(11));
      prismaMock.exercicio.findMany.mockResolvedValue(quiz);
    });

    it('returns 400 for an invalid body', async () => {
      await enviarQuiz(studentReq({ params: { id: '11' }, body: { respostas: 'x' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('completes the lesson and gives XP on the first pass', async () => {
      prismaMock.progressoLicao.findUnique.mockResolvedValue(null);
      // 4 de 5 certas = 80% (aprovado); item 5 ausente conta como errado
      const respostas = { '1': 0, '2': 0, '3': 0, '4': 0 };

      await enviarQuiz(studentReq({ params: { id: '11' }, body: { respostas } }), res);

      const body = res.json.mock.calls[0][0];
      expect(body).toMatchObject({ percentual: 80, aprovado: true, xpGanho: XP.licaoConcluida, licaoConcluida: true, proximaLicaoId: 12 });
      expect(body.resultados).toHaveLength(5);
      expect(body.resultados[4]).toMatchObject({ exercicioId: 5, correto: false, respostaEsperada: 'am' });
      expect(prismaMock.progressoLicao.upsert.mock.calls[0][0].create).toMatchObject({ concluida: true, melhorPercentual: 80, tentativas: 1 });
      expect(prismaMock.revisaoItem.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.perfilAprendiz.update.mock.calls[0][0].data.xp).toEqual({ increment: XP.licaoConcluida });
    });

    it('does not complete the lesson below 80%', async () => {
      prismaMock.progressoLicao.findUnique.mockResolvedValue(null);
      await enviarQuiz(studentReq({ params: { id: '11' }, body: { respostas: { '1': 0, '2': 0, '3': 0 } } }), res);
      expect(res.json.mock.calls[0][0]).toMatchObject({ percentual: 60, aprovado: false, xpGanho: 0, licaoConcluida: false });
      expect(prismaMock.progressoLicao.upsert.mock.calls[0][0].create.concluida).toBe(false);
    });

    it('gives the improvement bonus when beating the best score after completion', async () => {
      prismaMock.progressoLicao.findUnique.mockResolvedValue({ concluida: true, melhorPercentual: 80 });
      const respostas = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      await enviarQuiz(studentReq({ params: { id: '11' }, body: { respostas } }), res);
      expect(res.json.mock.calls[0][0]).toMatchObject({ percentual: 100, xpGanho: XP.licaoMelhorada, licaoConcluida: true });
      const update = prismaMock.progressoLicao.upsert.mock.calls[0][0].update;
      expect(update).toEqual({ tentativas: { increment: 1 }, melhorPercentual: 100 });
    });

    it('gives no XP when passing again without improving', async () => {
      prismaMock.progressoLicao.findUnique.mockResolvedValue({ concluida: true, melhorPercentual: 100 });
      const respostas = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      await enviarQuiz(studentReq({ params: { id: '11' }, body: { respostas } }), res);
      expect(res.json.mock.calls[0][0].xpGanho).toBe(0);
    });

    it('returns 409 when the lesson has no quiz', async () => {
      prismaMock.exercicio.findMany.mockResolvedValue([]);
      await enviarQuiz(studentReq({ params: { id: '11' }, body: { respostas: {} } }), res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 400 for an answer in the wrong format', async () => {
      await enviarQuiz(studentReq({ params: { id: '11' }, body: { respostas: { '1': 'am' } } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.progressoLicao.upsert).not.toHaveBeenCalled();
    });
  });

  // ── Revisão ─────────────────────────────────────────────────────────────────
  describe('listarRevisao', () => {
    it('returns due items without answer keys', async () => {
      prismaMock.revisaoItem.findMany.mockResolvedValue([{ caixa: 2, exercicio: { ...mcq(1, 'quiz'), licao: { titulo: 'L11' } } }]);
      prismaMock.revisaoItem.count.mockResolvedValue(1);

      await listarRevisao(studentReq(), res);

      const body = res.json.mock.calls[0][0];
      expect(body.total).toBe(1);
      expect(body.itens[0]).toEqual({
        id: 1, ordem: 1, etapa: 'quiz', tipo: 'mcq', enunciado: 'Escolha', conteudo: { opcoes: ['am', 'is'] }, caixa: 2, licaoTitulo: 'L11',
      });
      expect(prismaMock.revisaoItem.findMany.mock.calls[0][0]).toMatchObject({ take: 20, orderBy: { proximaEm: 'asc' } });
    });
  });

  describe('responderRevisao', () => {
    it('returns 404 when the item is not in the review', async () => {
      prismaMock.revisaoItem.findFirst.mockResolvedValue(null);
      await responderRevisao(studentReq({ params: { exercicioId: '1' }, body: { resposta: 0 } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 409 when the item is not due yet', async () => {
      prismaMock.revisaoItem.findFirst.mockResolvedValue({ id: 3, caixa: 2, proximaEm: new Date(Date.now() + 86400000), exercicio: mcq(1, 'quiz') });
      await responderRevisao(studentReq({ params: { exercicioId: '1' }, body: { resposta: 0 } }), res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('moves up a box and gives XP on a correct answer', async () => {
      prismaMock.revisaoItem.findFirst.mockResolvedValue({ id: 3, caixa: 2, proximaEm: new Date(0), exercicio: mcq(1, 'quiz') });
      await responderRevisao(studentReq({ params: { exercicioId: '1' }, body: { resposta: 0 } }), res);
      const body = res.json.mock.calls[0][0];
      expect(body).toMatchObject({ correto: true, caixa: 3, xpGanho: XP.revisaoCorreta });
      expect(typeof body.proximaEm).toBe('string');
      expect(prismaMock.revisaoItem.update.mock.calls[0][0].data).toMatchObject({ caixa: 3, acertos: { increment: 1 } });
    });

    it('goes back to box 1 on a miss', async () => {
      prismaMock.revisaoItem.findFirst.mockResolvedValue({ id: 3, caixa: 4, proximaEm: new Date(0), exercicio: mcq(1, 'quiz') });
      await responderRevisao(studentReq({ params: { exercicioId: '1' }, body: { resposta: 1 } }), res);
      expect(res.json.mock.calls[0][0]).toMatchObject({ correto: false, caixa: 1, xpGanho: 0 });
    });
  });

  // ── Teste de módulo ─────────────────────────────────────────────────────────
  describe('iniciarTeste', () => {
    it('returns 404 for an unpublished module', async () => {
      estado();
      await iniciarTeste(studentReq({ params: { id: '9' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 for a locked module', async () => {
      estado({ concluidas: [11, 12] });
      await iniciarTeste(studentReq({ params: { id: '2' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 409 when lessons are incomplete', async () => {
      estado({ concluidas: [11] });
      await iniciarTeste(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 423 with bloqueadoAte during the wait', async () => {
      estado({ concluidas: [11, 12], tentativas: [{ moduloId: 1, aprovado: false, percentual: 50, finalizadaEm: new Date() }] });
      prismaMock.tentativaTeste.findFirst.mockResolvedValue(null);
      await iniciarTeste(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json.mock.calls[0][0].bloqueadoAte).toEqual(expect.any(String));
    });

    it('returns the open attempt if there is one', async () => {
      estado({ concluidas: [11, 12] });
      prismaMock.tentativaTeste.findFirst.mockResolvedValue({ id: 50, forma: 2, itemIds: [102, 101] });
      prismaMock.itemTeste.findMany.mockResolvedValue([itemTeste(101, 'leitura', 2), itemTeste(102, 'escrita', 2)]);

      await iniciarTeste(studentReq({ params: { id: '1' } }), res);

      const body = res.json.mock.calls[0][0];
      expect(body.tentativaId).toBe(50);
      expect(body.itens.map((i: any) => i.id)).toEqual([102, 101]);
      expect(prismaMock.tentativaTeste.create).not.toHaveBeenCalled();
    });

    it('creates an attempt with a form different from the last one, without answer keys', async () => {
      estado({ concluidas: [11, 12] });
      prismaMock.tentativaTeste.findFirst
        .mockResolvedValueOnce(null) // tentativa aberta
        .mockResolvedValueOnce({ forma: 1 }); // última tentativa
      prismaMock.itemTeste.findMany
        .mockResolvedValueOnce([{ forma: 1 }, { forma: 2 }])
        .mockResolvedValueOnce([itemTeste(201, 'leitura', 2), itemTeste(202, 'escrita', 2)]);
      prismaMock.tentativaTeste.create.mockResolvedValue({ id: 51 });

      await iniciarTeste(studentReq({ params: { id: '1' } }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = res.json.mock.calls[0][0];
      expect(body).toMatchObject({ tentativaId: 51, forma: 2 });
      expect(body.itens[0]).toEqual({ id: 201, ordem: 201, habilidade: 'leitura', tipo: 'mcq', enunciado: 'Escolha', conteudo: { opcoes: ['am', 'is'] } });
      expect(prismaMock.tentativaTeste.create.mock.calls[0][0].data).toEqual({ usuarioId: 10, moduloId: 1, forma: 2, itemIds: [201, 202] });
    });

    // ── Adiantar o teste (nivelamento) ──
    /** Prepara os mocks para uma tentativa nova na forma 1. */
    function semTentativaAberta() {
      prismaMock.tentativaTeste.findFirst.mockResolvedValue(null);
      prismaMock.itemTeste.findMany
        .mockResolvedValueOnce([{ forma: 1 }, { forma: 2 }])
        .mockResolvedValueOnce([itemTeste(101, 'leitura'), itemTeste(102, 'escrita')]);
      prismaMock.tentativaTeste.create.mockResolvedValue({ id: 60 });
    }

    it('with adiantar: creates an attempt although lessons are incomplete', async () => {
      estado({ concluidas: [11] });
      semTentativaAberta();

      await iniciarTeste(studentReq({ params: { id: '1' }, body: { adiantar: true } }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0]).toMatchObject({ tentativaId: 60, forma: 1 });
      expect(prismaMock.tentativaTeste.create.mock.calls[0][0].data).toEqual({ usuarioId: 10, moduloId: 1, forma: 1, itemIds: [101, 102] });
    });

    it('with adiantar: resumes the open attempt', async () => {
      estado();
      prismaMock.tentativaTeste.findFirst.mockResolvedValue({ id: 50, forma: 1, itemIds: [101] });
      prismaMock.itemTeste.findMany.mockResolvedValue([itemTeste(101, 'leitura')]);

      await iniciarTeste(studentReq({ params: { id: '1' }, body: { adiantar: true } }), res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].tentativaId).toBe(50);
      expect(prismaMock.tentativaTeste.create).not.toHaveBeenCalled();
    });

    it.each([{ body: undefined }, { body: {} }, { body: { adiantar: false } }])(
      'without the flag ($body): still 409 when lessons are incomplete',
      async ({ body }) => {
        estado({ concluidas: [11] });
        await iniciarTeste(studentReq({ params: { id: '1' }, body }), res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(prismaMock.tentativaTeste.create).not.toHaveBeenCalled();
      },
    );

    it('with adiantar: still 403 for a locked module', async () => {
      estado();
      await iniciarTeste(studentReq({ params: { id: '2' }, body: { adiantar: true } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(prismaMock.tentativaTeste.create).not.toHaveBeenCalled();
    });

    it('with adiantar: still 423 during the wait after a failed attempt', async () => {
      estado({ tentativas: [{ moduloId: 1, aprovado: false, percentual: 40, finalizadaEm: new Date() }] });
      prismaMock.tentativaTeste.findFirst.mockResolvedValue(null);
      await iniciarTeste(studentReq({ params: { id: '1' }, body: { adiantar: true } }), res);
      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json.mock.calls[0][0].bloqueadoAte).toEqual(expect.any(String));
      expect(prismaMock.tentativaTeste.create).not.toHaveBeenCalled();
    });

    it('with adiantar: unlocks the test of the next module after a test-out', async () => {
      estado({ tentativas: [{ moduloId: 1, aprovado: true, percentual: 90, finalizadaEm: new Date() }] });
      semTentativaAberta();
      await iniciarTeste(studentReq({ params: { id: '2' }, body: { adiantar: true } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it.each([{ body: undefined }, { body: { adiantar: true } }])(
      'module already passed with lessons incomplete: retake allowed with or without the flag ($body)',
      async ({ body }) => {
        estado({ tentativas: [{ moduloId: 1, aprovado: true, percentual: 90, finalizadaEm: new Date() }] });
        semTentativaAberta();
        await iniciarTeste(studentReq({ params: { id: '1' }, body }), res);
        expect(res.status).toHaveBeenCalledWith(201);
      },
    );

    it('returns 400 when adiantar is not a boolean', async () => {
      estado();
      await iniciarTeste(studentReq({ params: { id: '1' }, body: { adiantar: 'sim' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.nivel.findMany).not.toHaveBeenCalled();
    });

    it('returns 409 when the module has no test items', async () => {
      estado({ concluidas: [11, 12] });
      prismaMock.tentativaTeste.findFirst.mockResolvedValue(null);
      prismaMock.itemTeste.findMany.mockResolvedValue([]);
      await iniciarTeste(studentReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('finalizarTentativa', () => {
    const itens = [itemTeste(1, 'gramatica_vocabulario'), itemTeste(2, 'leitura'), itemTeste(3, 'escrita'), itemTeste(4, 'leitura')];
    const aberta = { id: 50, usuarioId: 10, moduloId: 1, forma: 1, itemIds: [1, 2, 3, 4], finalizadaEm: null };

    beforeEach(() => {
      prismaMock.tentativaTeste.findUnique.mockResolvedValue(aberta);
      prismaMock.itemTeste.findMany.mockResolvedValue(itens);
      prismaMock.tentativaTeste.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.tentativaTeste.count.mockResolvedValue(0);
    });

    it('returns 404 for another student attempt', async () => {
      prismaMock.tentativaTeste.findUnique.mockResolvedValue({ ...aberta, usuarioId: 99 });
      await finalizarTentativa(studentReq({ params: { id: '50' }, body: { respostas: {} } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 409 for a finished attempt', async () => {
      prismaMock.tentativaTeste.findUnique.mockResolvedValue({ ...aberta, finalizadaEm: new Date() });
      await finalizarTentativa(studentReq({ params: { id: '50' }, body: { respostas: {} } }), res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('passes, gives XP on the first approval and points to the next module', async () => {
      estado({ concluidas: [11, 12], tentativas: [{ moduloId: 1, aprovado: true, percentual: 100, finalizadaEm: new Date() }] });
      const respostas = { '1': 0, '2': 0, '3': 0, '4': 0 };

      await finalizarTentativa(studentReq({ params: { id: '50' }, body: { respostas } }), res);

      const body = res.json.mock.calls[0][0];
      expect(body).toMatchObject({ percentual: 100, aprovado: true, xpGanho: XP.testeAprovado, bloqueadoAte: null, proximoModuloId: 2 });
      expect(body.porHabilidade).toEqual({ gramatica_vocabulario: 100, leitura: 100, escrita: 100 });
      expect(body.resultados[0]).toMatchObject({ itemId: 1, habilidade: 'gramatica_vocabulario', correto: true });
      expect(prismaMock.tentativaTeste.updateMany.mock.calls[0][0].where).toEqual({ id: 50, finalizadaEm: null });
    });

    it('gives no XP when the module was already passed', async () => {
      estado();
      prismaMock.tentativaTeste.count.mockResolvedValue(1);
      await finalizarTentativa(studentReq({ params: { id: '50' }, body: { respostas: { '1': 0, '2': 0, '3': 0, '4': 0 } } }), res);
      expect(res.json.mock.calls[0][0].xpGanho).toBe(0);
    });

    it('fails a weak skill and sets a 24 h wait', async () => {
      // escrita errada: 75% no geral, mas 0% em escrita
      await finalizarTentativa(studentReq({ params: { id: '50' }, body: { respostas: { '1': 0, '2': 0, '4': 0 } } }), res);
      const body = res.json.mock.calls[0][0];
      expect(body).toMatchObject({ percentual: 75, aprovado: false, xpGanho: 0, proximoModuloId: null });
      const espera = Date.parse(body.bloqueadoAte) - Date.now();
      expect(espera).toBeGreaterThan(23.9 * 3600_000);
      expect(espera).toBeLessThanOrEqual(24 * 3600_000);
    });

    it('returns 409 if the attempt was finished concurrently', async () => {
      prismaMock.tentativaTeste.updateMany.mockResolvedValue({ count: 0 });
      await finalizarTentativa(studentReq({ params: { id: '50' }, body: { respostas: {} } }), res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(prismaMock.perfilAprendiz.update).not.toHaveBeenCalled();
    });
  });

  // ── PATCH /curso/perfil ─────────────────────────────────────────────────────
  describe('atualizarPerfil', () => {
    it('rejects other methodologies as "em breve"', async () => {
      await atualizarPerfil(studentReq({ body: { metodologia: 'comunicativa' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/em breve/);
    });

    it('rejects unknown values', async () => {
      await atualizarPerfil(studentReq({ body: { metodologia: 'xyz' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts "gramatica" and returns the profile', async () => {
      await atualizarPerfil(studentReq({ body: { metodologia: 'gramatica' } }), res);
      expect(res.json.mock.calls[0][0]).toMatchObject({ metodologia: 'gramatica', xp: 40, revisoesPendentes: 0 });
    });
    it('saves the daily goal and finishes the onboarding once', async () => {
      await atualizarPerfil(studentReq({ body: { metaDiariaXp: 60, onboardingConcluido: true } }), res);
      const data = prismaMock.perfilAprendiz.update.mock.calls[0][0].data;
      expect(data.metaDiariaXp).toBe(60);
      expect(data.onboardingEm).toBeInstanceOf(Date);
      expect(data.metodologia).toBeUndefined();
    });

    it('does not overwrite the onboarding date', async () => {
      prismaMock.perfilAprendiz.findUniqueOrThrow.mockResolvedValue({ ...perfil, onboardingEm: new Date('2026-01-01') });
      await atualizarPerfil(studentReq({ body: { onboardingConcluido: true } }), res);
      expect(prismaMock.perfilAprendiz.update.mock.calls[0][0].data.onboardingEm).toBeUndefined();
      expect(res.json.mock.calls[0][0].onboardingPendente).toBe(false);
    });

    it('turns the e-mail reminders on and off', async () => {
      prismaMock.perfilAprendiz.findUniqueOrThrow.mockResolvedValue({ ...perfil, lembretesEmail: true });
      await atualizarPerfil(studentReq({ body: { lembretesEmail: true } }), res);
      expect(prismaMock.perfilAprendiz.update.mock.calls[0][0].data).toEqual({ lembretesEmail: true });
      expect(res.json.mock.calls[0][0].lembretesEmail).toBe(true);

      await atualizarPerfil(studentReq({ body: { lembretesEmail: false, metaDiariaXp: 10 } }), res);
      expect(prismaMock.perfilAprendiz.update.mock.calls[1][0].data).toEqual({ lembretesEmail: false, metaDiariaXp: 10 });
    });

    it('leaves the reminders alone when the field is not sent, and rejects a non-boolean', async () => {
      await atualizarPerfil(studentReq({ body: { metaDiariaXp: 30 } }), res);
      expect(prismaMock.perfilAprendiz.update.mock.calls[0][0].data.lembretesEmail).toBeUndefined();

      res = mockRes();
      await atualizarPerfil(studentReq({ body: { lembretesEmail: 'sim' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.perfilAprendiz.update).toHaveBeenCalledTimes(1);
    });

    it('rejects a goal outside the options and an empty body', async () => {
      await atualizarPerfil(studentReq({ body: { metaDiariaXp: 25 } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/Meta diária/);
      res = mockRes();
      await atualizarPerfil(studentReq({ body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.perfilAprendiz.update).not.toHaveBeenCalled();
    });
  });
});
