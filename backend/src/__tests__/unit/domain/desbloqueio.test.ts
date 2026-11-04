import { describe, it, expect } from 'vitest';
import {
  bloqueadoAte,
  calcularTrilha,
  escolherForma,
  percentualDe,
  respostaVazia,
} from '../../../domain/desbloqueio.js';
import { corrigir } from '../../../domain/correcao.js';

const agora = new Date('2026-01-10T12:00:00Z');
const horasAtras = (h: number) => new Date(agora.getTime() - h * 3600_000);

const modulos = [
  { id: 1, licoes: [{ id: 11 }, { id: 12 }] },
  { id: 2, licoes: [{ id: 21 }, { id: 22 }] },
  { id: 3, licoes: [{ id: 31 }] },
];

describe('calcularTrilha', () => {
  it('unlocks only the first module and its first lesson for a new student', () => {
    const t = calcularTrilha(modulos, new Set(), [], agora);
    expect(t.get(1)).toMatchObject({ desbloqueado: true, licoesConcluidas: 0, totalLicoes: 2, testeDisponivel: false });
    expect(t.get(1)!.licoes.get(11)).toEqual({ desbloqueada: true, concluida: false });
    expect(t.get(1)!.licoes.get(12)!.desbloqueada).toBe(false);
    expect(t.get(2)!.desbloqueado).toBe(false);
    expect(t.get(2)!.licoes.get(21)!.desbloqueada).toBe(false);
  });

  it('unlocks lesson N when lesson N-1 is done, and the test when all are done', () => {
    let t = calcularTrilha(modulos, new Set([11]), [], agora);
    expect(t.get(1)!.licoes.get(12)!.desbloqueada).toBe(true);
    expect(t.get(1)!.testeDisponivel).toBe(false);
    t = calcularTrilha(modulos, new Set([11, 12]), [], agora);
    expect(t.get(1)).toMatchObject({ todasConcluidas: true, testeDisponivel: true });
  });

  it('unlocks module N only after the test of module N-1 is passed', () => {
    const tentativas = [
      { moduloId: 1, aprovado: false, percentual: 50, finalizadaEm: horasAtras(48) },
      { moduloId: 1, aprovado: true, percentual: 90, finalizadaEm: horasAtras(30) },
    ];
    const t = calcularTrilha(modulos, new Set([11, 12]), tentativas, agora);
    expect(t.get(1)).toMatchObject({ aprovado: true, melhorPercentual: 90, tentativas: 2, proximoModuloId: 2 });
    expect(t.get(2)!.desbloqueado).toBe(true);
    expect(t.get(2)!.licoes.get(21)!.desbloqueada).toBe(true);
    expect(t.get(3)!.desbloqueado).toBe(false);
    expect(t.get(3)!.proximoModuloId).toBeNull();
  });

  it('does not unlock a module whose predecessor is locked, even with a stale approval', () => {
    // aprovado no módulo 2, mas o módulo 1 não foi aprovado (ex.: módulo 1 novo publicado depois)
    const tentativas = [{ moduloId: 2, aprovado: true, percentual: 80, finalizadaEm: horasAtras(5) }];
    const t = calcularTrilha(modulos, new Set(), tentativas, agora);
    expect(t.get(2)!.desbloqueado).toBe(false);
    expect(t.get(3)!.desbloqueado).toBe(false);
  });

  it('makes the test unavailable during the 24 h wait after a failure', () => {
    const tentativas = [{ moduloId: 1, aprovado: false, percentual: 60, finalizadaEm: horasAtras(2) }];
    const t = calcularTrilha(modulos, new Set([11, 12]), tentativas, agora);
    expect(t.get(1)!.testeDisponivel).toBe(false);
    expect(t.get(1)!.bloqueadoAte).toEqual(new Date(horasAtras(2).getTime() + 24 * 3600_000));
  });

  it('treats a module without published lessons as having all lessons done', () => {
    const t = calcularTrilha([{ id: 9, licoes: [] }], new Set(), [], agora);
    expect(t.get(9)).toMatchObject({ todasConcluidas: true, testeDisponivel: true });
  });
});

describe('bloqueadoAte', () => {
  it('is null without attempts, after the wait, or when the last attempt passed', () => {
    expect(bloqueadoAte([], agora)).toBeNull();
    expect(bloqueadoAte([{ moduloId: 1, aprovado: false, percentual: 10, finalizadaEm: horasAtras(25) }], agora)).toBeNull();
    expect(
      bloqueadoAte(
        [
          { moduloId: 1, aprovado: false, percentual: 10, finalizadaEm: horasAtras(3) },
          { moduloId: 1, aprovado: true, percentual: 90, finalizadaEm: horasAtras(1) },
        ],
        agora,
      ),
    ).toBeNull();
  });

  it('uses the most recent attempt', () => {
    const r = bloqueadoAte(
      [
        { moduloId: 1, aprovado: true, percentual: 90, finalizadaEm: horasAtras(10) },
        { moduloId: 1, aprovado: false, percentual: 40, finalizadaEm: horasAtras(1) },
      ],
      agora,
    );
    expect(r).toEqual(new Date(horasAtras(1).getTime() + 24 * 3600_000));
  });
});

describe('escolherForma', () => {
  it('rotates to a different form than the last one', () => {
    expect(escolherForma([1, 2], null)).toBe(1);
    expect(escolherForma([2, 1, 2], 1)).toBe(2);
    expect(escolherForma([1, 2, 3], 3)).toBe(1);
  });

  it('repeats the only form available, and returns null without items', () => {
    expect(escolherForma([1], 1)).toBe(1);
    expect(escolherForma([], null)).toBeNull();
  });
});

describe('respostaVazia', () => {
  const casos = [
    { tipo: 'mcq', conteudo: { opcoes: ['a', 'b'] }, gabarito: { correta: 1 }, esperada: 'b' },
    { tipo: 'cloze', conteudo: { texto: 'I ___ here.' }, gabarito: { respostas: [['am']] }, esperada: 'I am here.' },
    { tipo: 'word_order', conteudo: { palavras: ['am', 'I'] }, gabarito: { aceitas: ['I am'] }, esperada: 'I am' },
    { tipo: 'match', conteudo: { esquerda: ['a', 'b'], direita: ['x', 'y'] }, gabarito: { pares: [1, 0] }, esperada: 'a → y; b → x' },
    { tipo: 'translate', conteudo: { frase: 'Oi', direcao: 'pt-en' }, gabarito: { aceitas: ['Hi'] }, esperada: 'Hi' },
  ];

  it.each(casos)('counts as wrong and still returns the expected answer ($tipo)', (c) => {
    const r = corrigir({ ...c, explicacao: 'x' }, respostaVazia(c.tipo));
    expect(r).toMatchObject({ correto: false, pontuacao: 0, respostaEsperada: c.esperada });
  });
});

describe('percentualDe', () => {
  it('averages partial credit and rounds', () => {
    expect(percentualDe([1, 0.5, 0])).toBe(50);
    expect(percentualDe([1, 1, 0])).toBe(67);
    expect(percentualDe([])).toBe(0);
  });
});
