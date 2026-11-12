import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  nivel: { findMany: vi.fn() },
  modulo: { findUnique: vi.fn(), update: vi.fn() },
  licao: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  exercicio: { deleteMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import {
  listarConteudo,
  getLicaoConteudo,
  salvarLicao,
  alterarStatusLicao,
  alterarStatusModulo,
  getTesteModulo,
  verificarItem,
} from '../../../http/controllers/ConteudoController.js';
import { mockReq, mockRes } from '../../helpers/mockReqRes.js';
import { Prisma } from '../../../database/generated/prisma/client.js';

const mcq = (extra: object = {}) => ({
  tipo: 'mcq',
  enunciado: 'Escolha',
  conteudo: { opcoes: ['am', 'is'] },
  gabarito: { correta: 0 },
  explicacao: 'Use am com I',
  ...extra,
});

const ditado = { tipo: 'dictation', enunciado: 'Ouça e escreva.', conteudo: { frase: "It's cold today." }, gabarito: { aceitas: ['It is cold today.'] }, explicacao: 'x' };

const apresentacao = {
  explicacao: ['O verbo to be.'],
  exemplos: [
    { en: 'I am Ana.', pt: 'Eu sou a Ana.' },
    { en: 'You are here.', pt: 'Você está aqui.' },
    { en: 'She is a teacher.', pt: 'Ela é professora.' },
  ],
};

const edicao = (exercicios: object[]) => ({
  titulo: 'Verb to be',
  objetivo: 'Apresentar-se',
  minutosEstimados: 15,
  apresentacao,
  exercicios,
});

const licaoDb = {
  id: 11,
  slug: 'a1-m01-l1',
  ordem: 1,
  titulo: 'Verb to be',
  objetivo: 'obj',
  minutosEstimados: 15,
  status: 'revisao',
  apresentacao,
  modulo: { id: 1, slug: 'a1-m01', titulo: 'M1' },
  exercicios: [{ id: 1, ordem: 1, etapa: 'quiz', licaoId: 11, ...mcq({ tagsErro: ['be'] }) }],
};

describe('ConteudoController', () => {
  let res: any;

  beforeEach(() => {
    vi.resetAllMocks();
    res = mockRes();
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  describe('listarConteudo', () => {
    it('returns the tree with counts and statuses', async () => {
      prismaMock.nivel.findMany.mockResolvedValue([
        {
          id: 1,
          codigo: 'A1',
          nome: 'Iniciante',
          modulos: [
            {
              id: 1, slug: 'a1-m01', ordem: 1, titulo: 'M1', tema: 't', status: 'revisao',
              _count: { itensTeste: 30 },
              licoes: [{ id: 11, ordem: 1, slug: 'l1', titulo: 'L1', status: 'publicado', _count: { exercicios: 12 }, atualizadoEm: new Date(0), revisadoEm: null }],
            },
          ],
        },
      ]);
      await listarConteudo(mockReq(), res);
      const m = res.json.mock.calls[0][0].niveis[0].modulos[0];
      expect(m).toMatchObject({ id: 1, status: 'revisao', totalItensTeste: 30 });
      expect(m.licoes[0]).toMatchObject({ id: 11, status: 'publicado', totalExercicios: 12, revisadoEm: null });
    });
  });

  describe('getLicaoConteudo', () => {
    it('returns 404 for a missing lesson', async () => {
      prismaMock.licao.findUnique.mockResolvedValue(null);
      await getLicaoConteudo(mockReq({ params: { id: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('includes answer keys and explanations for the teacher', async () => {
      prismaMock.licao.findUnique.mockResolvedValue(licaoDb);
      await getLicaoConteudo(mockReq({ params: { id: '11' } }), res);
      const ex = res.json.mock.calls[0][0].exercicios[0];
      expect(ex).toMatchObject({ id: 1, gabarito: { correta: 0 }, explicacao: 'Use am com I', tagsErro: ['be'] });
      expect(ex).not.toHaveProperty('licaoId');
    });
  });

  describe('salvarLicao', () => {
    it('returns 400 for an invalid body', async () => {
      await salvarLicao(mockReq({ params: { id: '11' }, body: edicao([{ ...mcq(), etapa: 'quiz', gabarito: { correta: 5 } }]) }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('returns 400 without any quiz item', async () => {
      await salvarLicao(mockReq({ params: { id: '11' }, body: edicao([{ ...mcq(), etapa: 'controlada' }]) }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 for a missing lesson', async () => {
      prismaMock.licao.findUnique.mockResolvedValue(null);
      await salvarLicao(mockReq({ params: { id: '11' }, body: edicao([{ ...mcq(), etapa: 'quiz' }]) }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when an exercise id belongs to another lesson', async () => {
      prismaMock.licao.findUnique.mockResolvedValue({ id: 11, exercicios: [{ id: 1 }] });
      await salvarLicao(mockReq({ params: { id: '11' }, body: edicao([{ ...mcq(), etapa: 'quiz', id: 999 }]) }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toMatch(/999/);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('updates, creates and deletes exercises in array order', async () => {
      prismaMock.licao.findUnique
        .mockResolvedValueOnce({ id: 11, exercicios: [{ id: 1 }, { id: 2 }] })
        .mockResolvedValueOnce(licaoDb);
      const body = edicao([
        { ...mcq(), etapa: 'controlada' }, // novo
        { ...mcq({ enunciado: 'Editado' }), etapa: 'quiz', id: 2 }, // existente
      ]);

      await salvarLicao(mockReq({ params: { id: '11' }, body }), res);

      expect(prismaMock.licao.update.mock.calls[0][0].data).toMatchObject({ titulo: 'Verb to be', minutosEstimados: 15 });
      expect(prismaMock.exercicio.deleteMany).toHaveBeenCalledWith({ where: { licaoId: 11, id: { notIn: [2] } } });
      expect(prismaMock.exercicio.create.mock.calls[0][0].data).toMatchObject({ licaoId: 11, ordem: 1, etapa: 'controlada', tipo: 'mcq' });
      expect(prismaMock.exercicio.update.mock.calls[0][0]).toMatchObject({ where: { id: 2 }, data: { ordem: 2, enunciado: 'Editado' } });
      expect(res.json.mock.calls[0][0]).toMatchObject({ id: 11 });
    });

    it('accepts tagsErro: null as returned by the GET (and clears the tags)', async () => {
      prismaMock.licao.findUnique
        .mockResolvedValueOnce({ id: 11, exercicios: [{ id: 1 }] })
        .mockResolvedValueOnce(licaoDb);
      const body = edicao([{ ...mcq(), etapa: 'quiz', id: 1, ordem: 1, tagsErro: null }]);

      await salvarLicao(mockReq({ params: { id: '11' }, body }), res);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(prismaMock.exercicio.update.mock.calls[0][0].data.tagsErro).toBe(Prisma.DbNull);
    });
  });

  describe('alterarStatusLicao', () => {
    it('returns 400 for an invalid status', async () => {
      await alterarStatusLicao(mockReq({ params: { id: '11' }, body: { status: 'aprovado' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('records the reviewer when publishing', async () => {
      prismaMock.licao.findUnique.mockResolvedValue({ id: 11 });
      prismaMock.licao.update.mockResolvedValue({ id: 11, status: 'publicado' });
      await alterarStatusLicao(mockReq({ params: { id: '11' }, body: { status: 'publicado' } }), res);
      const data = prismaMock.licao.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ status: 'publicado', revisadoPorId: 1 });
      expect(data.revisadoEm).toBeInstanceOf(Date);
    });

    it('does not touch the reviewer when moving back to draft', async () => {
      prismaMock.licao.findUnique.mockResolvedValue({ id: 11 });
      prismaMock.licao.update.mockResolvedValue({ id: 11, status: 'rascunho' });
      await alterarStatusLicao(mockReq({ params: { id: '11' }, body: { status: 'rascunho' } }), res);
      expect(prismaMock.licao.update.mock.calls[0][0].data).toEqual({ status: 'rascunho' });
    });

    it('returns 404 for a missing lesson', async () => {
      prismaMock.licao.findUnique.mockResolvedValue(null);
      await alterarStatusLicao(mockReq({ params: { id: '11' }, body: { status: 'publicado' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('alterarStatusModulo', () => {
    it('publishes the module and, optionally, all its lessons', async () => {
      prismaMock.modulo.findUnique.mockResolvedValue({ id: 1 });
      prismaMock.modulo.update.mockResolvedValue({ id: 1, slug: 'a1-m01', status: 'publicado' });
      prismaMock.licao.updateMany.mockResolvedValue({ count: 6 });

      await alterarStatusModulo(mockReq({ params: { id: '1' }, body: { status: 'publicado', incluirLicoes: true } }), res);

      expect(prismaMock.licao.updateMany.mock.calls[0][0]).toMatchObject({
        where: { moduloId: 1 },
        data: { status: 'publicado', revisadoPorId: 1 },
      });
      expect(res.json).toHaveBeenCalledWith({ id: 1, slug: 'a1-m01', status: 'publicado', licoesAtualizadas: 6 });
    });

    it('leaves lessons alone without incluirLicoes', async () => {
      prismaMock.modulo.findUnique.mockResolvedValue({ id: 1 });
      prismaMock.modulo.update.mockResolvedValue({ id: 1, slug: 'a1-m01', status: 'revisao' });
      await alterarStatusModulo(mockReq({ params: { id: '1' }, body: { status: 'revisao' } }), res);
      expect(prismaMock.licao.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getTesteModulo', () => {
    it('groups items by form', async () => {
      prismaMock.modulo.findUnique.mockResolvedValue({
        id: 1, slug: 'a1-m01', titulo: 'M1',
        itensTeste: [{ id: 1, forma: 1 }, { id: 2, forma: 1 }, { id: 3, forma: 2 }],
      });
      await getTesteModulo(mockReq({ params: { id: '1' } }), res);
      const body = res.json.mock.calls[0][0];
      expect(body.modulo).toEqual({ id: 1, slug: 'a1-m01', titulo: 'M1' });
      expect(body.formas.map((f: any) => [f.forma, f.itens.length])).toEqual([[1, 2], [2, 1]]);
    });
  });

  describe('verificarItem', () => {
    it('validates the item with the content schema', async () => {
      await verificarItem(mockReq({ body: { item: { tipo: 'mcq' }, resposta: 0 } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('corrects an unsaved item', async () => {
      await verificarItem(mockReq({ body: { item: mcq(), resposta: 1 } }), res);
      expect(res.json).toHaveBeenCalledWith({ correto: false, pontuacao: 0, respostaEsperada: 'am', explicacao: 'Use am com I' });
    });

    it('returns 400 for an answer in the wrong format', async () => {
      await verificarItem(mockReq({ body: { item: mcq(), resposta: 'am' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('corrects an unsaved dictation item and shows the spoken sentence', async () => {
      await verificarItem(mockReq({ body: { item: ditado, resposta: 'it is cold today' } }), res);
      expect(res.json).toHaveBeenCalledWith({ correto: true, pontuacao: 1, respostaEsperada: "It's cold today.", explicacao: 'x' });
    });

    it('returns 400 for a dictation whose sentence is not in its own key', async () => {
      await verificarItem(mockReq({ body: { item: { ...ditado, gabarito: { aceitas: ['It is hot today.'] } }, resposta: 'x' } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('dictation in a lesson', () => {
    it('is refused in the mini-quiz before touching the database', async () => {
      await salvarLicao(mockReq({ params: { id: '11' }, body: edicao([{ ...mcq(), etapa: 'quiz' }, { ...ditado, etapa: 'quiz' }]) }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/mini-quiz/) });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});
