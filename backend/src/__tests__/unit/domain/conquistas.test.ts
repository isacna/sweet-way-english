import { describe, it, expect } from 'vitest';
import { calcularConquistas, nivelConcluido, type DadosConquistas } from '../../../domain/conquistas.js';

const A1 = { codigo: 'A1', nome: 'Básico 1', totalModulos: 10, modulosAprovados: 0 };
const A2 = { codigo: 'A2', nome: 'Básico 2', totalModulos: 10, modulosAprovados: 0 };

const zero: DadosConquistas = { xp: 0, ofensivaMaxima: 0, licoesConcluidas: 0, licoesNotaMaxima: 0, niveis: [A1, A2] };

function obtidas(d: Partial<DadosConquistas>) {
  return calcularConquistas({ ...zero, ...d })
    .filter((c) => c.obtida)
    .map((c) => c.id);
}

describe('calcularConquistas', () => {
  it('lists every achievement as locked for a new student', () => {
    const lista = calcularConquistas(zero);
    expect(lista.map((c) => c.id)).toEqual([
      'primeira-licao',
      'dez-licoes',
      'quiz-perfeito',
      'primeiro-modulo',
      'ofensiva-3',
      'ofensiva-7',
      'ofensiva-30',
      'xp-500',
      'xp-2000',
      'nivel-a1',
      'nivel-a2',
    ]);
    expect(lista.every((c) => !c.obtida)).toBe(true);
    expect(lista.every((c) => c.titulo && c.descricao)).toBe(true);
  });

  it.each<[string, Partial<DadosConquistas>, string[]]>([
    ['first lesson', { licoesConcluidas: 1 }, ['primeira-licao']],
    ['9 lessons', { licoesConcluidas: 9 }, ['primeira-licao']],
    ['10 lessons', { licoesConcluidas: 10 }, ['primeira-licao', 'dez-licoes']],
    ['a perfect quiz', { licoesConcluidas: 1, licoesNotaMaxima: 1 }, ['primeira-licao', 'quiz-perfeito']],
    ['streak of 2', { ofensivaMaxima: 2 }, []],
    ['streak of 3', { ofensivaMaxima: 3 }, ['ofensiva-3']],
    ['streak of 7', { ofensivaMaxima: 7 }, ['ofensiva-3', 'ofensiva-7']],
    ['streak of 45', { ofensivaMaxima: 45 }, ['ofensiva-3', 'ofensiva-7', 'ofensiva-30']],
    ['499 XP', { xp: 499 }, []],
    ['500 XP', { xp: 500 }, ['xp-500']],
    ['2000 XP', { xp: 2000 }, ['xp-500', 'xp-2000']],
    ['one module passed', { niveis: [{ ...A1, modulosAprovados: 1 }, A2] }, ['primeiro-modulo']],
    ['a module passed in another level', { niveis: [A1, { ...A2, modulosAprovados: 1 }] }, ['primeiro-modulo']],
    ['level A1 complete', { niveis: [{ ...A1, modulosAprovados: 10 }, A2] }, ['primeiro-modulo', 'nivel-a1']],
  ])('%s', (_nome, dados, esperado) => {
    expect(obtidas(dados)).toEqual(esperado);
  });

  it('reports progress capped at the target, only for counting achievements', () => {
    const lista = calcularConquistas({ ...zero, xp: 3200, licoesConcluidas: 4, ofensivaMaxima: 5, niveis: [{ ...A1, modulosAprovados: 3 }] });
    const por = Object.fromEntries(lista.map((c) => [c.id, c]));
    expect(por['primeira-licao'].progresso).toBeUndefined();
    expect(por['quiz-perfeito'].progresso).toBeUndefined();
    expect(por['dez-licoes'].progresso).toEqual({ atual: 4, alvo: 10 });
    expect(por['ofensiva-3'].progresso).toEqual({ atual: 3, alvo: 3 });
    expect(por['ofensiva-7'].progresso).toEqual({ atual: 5, alvo: 7 });
    expect(por['xp-500'].progresso).toEqual({ atual: 500, alvo: 500 });
    expect(por['xp-2000'].progresso).toEqual({ atual: 2000, alvo: 2000 });
    expect(por['nivel-a1']).toMatchObject({ obtida: false, progresso: { atual: 3, alvo: 10 } });
    expect(por['nivel-a2']).toBeUndefined();
  });

  it('has no level achievement for a level without published modules', () => {
    const lista = calcularConquistas({ ...zero, niveis: [{ ...A1, totalModulos: 0 }] });
    expect(lista.some((c) => c.id.startsWith('nivel-'))).toBe(false);
  });
});

describe('nivelConcluido', () => {
  it.each([
    [0, 0, false], // sem módulos publicados nunca está concluído
    [10, 9, false],
    [10, 10, true],
    [1, 1, true],
  ])('total %i, passed %i → %s', (totalModulos, modulosAprovados, esperado) => {
    expect(nivelConcluido({ totalModulos, modulosAprovados })).toBe(esperado);
  });
});
