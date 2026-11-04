import { describe, it, expect } from 'vitest';
import { itemSchema, moduloSchema } from '../../../domain/conteudo/schema.js';

const mcq = { tipo: 'mcq', enunciado: 'Escolha', explicacao: 'Use is com he/she/it.', conteudo: { opcoes: ['am', 'is', 'are'] }, gabarito: { correta: 1 } };
const cloze = { tipo: 'cloze', enunciado: 'Complete', explicacao: 'x', conteudo: { texto: 'I ___ a student.' }, gabarito: { respostas: [['am', "'m"]] } };
const traducao = { tipo: 'translate', enunciado: 'Traduza', explicacao: 'x', conteudo: { frase: 'Eu sou brasileiro.', direcao: 'pt-en' }, gabarito: { aceitas: ['I am Brazilian.'] } };

function moduloValido() {
  const pratica = Array.from({ length: 6 }, (_, i) => ({ ...(i % 2 ? mcq : cloze), etapa: 'controlada' }));
  const quiz = Array.from({ length: 4 }, () => ({ ...mcq, etapa: 'quiz' }));
  const forma = (f: number) =>
    Array.from({ length: 15 }, (_, i) => ({
      ...(i < 10 ? mcq : i < 13 ? cloze : traducao),
      forma: f,
      habilidade: i < 10 ? 'gramatica_vocabulario' : i < 13 ? 'leitura' : 'escrita',
    }));
  return {
    slug: 'a1-m01', ordem: 1, titulo: 'Hello!', tema: 'Cumprimentos', descricao: 'd',
    canDos: ['Cumprimentar', 'Soletrar o nome'], gramatica: 'be', vocabulario: 'cumprimentos', funcao: 'cumprimentar',
    licoes: [{
      slug: 'a1-m01-l1', ordem: 1, titulo: 'Hi', objetivo: 'o', minutosEstimados: 25,
      apresentacao: { explicacao: ['p'], exemplos: [{ en: 'Hi', pt: 'Oi' }, { en: 'Hello', pt: 'Olá' }, { en: 'Bye', pt: 'Tchau' }] },
      exercicios: [...pratica, ...quiz],
    }],
    teste: { itens: [...forma(1), ...forma(2)] },
  };
}

const erros = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues.map((i) => i.message) ?? [];

describe('itemSchema', () => {
  it('accepts valid items', () => {
    for (const i of [mcq, cloze, traducao]) expect(itemSchema.safeParse(i).success).toBe(true);
  });

  it('rejects mcq with the answer out of range', () => {
    expect(erros(itemSchema.safeParse({ ...mcq, gabarito: { correta: 3 } }))).toContain('mcq: `correta` fora das opções');
  });

  it('rejects cloze whose gaps and answers do not match', () => {
    const r = itemSchema.safeParse({ ...cloze, conteudo: { texto: 'I ___ a ___.' } });
    expect(r.success).toBe(false);
  });

  it('rejects cloze options that do not contain an accepted answer', () => {
    const r = itemSchema.safeParse({ ...cloze, conteudo: { texto: 'I ___ a student.', opcoesPorLacuna: [['is', 'are']] } });
    expect(r.success).toBe(false);
  });

  it('rejects word_order answers that use different words', () => {
    const base = { tipo: 'word_order', enunciado: 'Ordene', explicacao: 'x', conteudo: { palavras: ['is', 'She', 'a', 'teacher'] } };
    expect(itemSchema.safeParse({ ...base, gabarito: { aceitas: ['She is a teacher.'] } }).success).toBe(true);
    expect(itemSchema.safeParse({ ...base, gabarito: { aceitas: ['She is teacher.'] } }).success).toBe(false);
  });

  it('rejects match pairs that are not a permutation', () => {
    const base = { tipo: 'match', enunciado: 'Associe', explicacao: 'x', conteudo: { esquerda: ['a', 'b'], direita: ['1', '2'] } };
    expect(itemSchema.safeParse({ ...base, gabarito: { pares: [1, 0] } }).success).toBe(true);
    expect(itemSchema.safeParse({ ...base, gabarito: { pares: [0, 0] } }).success).toBe(false);
  });

  it('rejects error_correction whose wrong sentence is accepted', () => {
    const r = itemSchema.safeParse({ tipo: 'error_correction', enunciado: 'Corrija', explicacao: 'x', conteudo: { frase: 'She work.' }, gabarito: { aceitas: ['she work'] } });
    expect(r.success).toBe(false);
  });
});

describe('moduloSchema', () => {
  it('accepts a complete module', () => {
    const r = moduloSchema.safeParse(moduloValido());
    expect(erros(r)).toEqual([]);
  });

  it('requires at least 4 quiz items per lesson', () => {
    const m = moduloValido();
    m.licoes[0].exercicios = m.licoes[0].exercicios.filter((e) => e.etapa !== 'quiz');
    expect(erros(moduloSchema.safeParse(m)).join()).toMatch(/mini-quiz/);
  });

  it('requires two test forms covering every skill', () => {
    const m = moduloValido();
    m.teste.itens = m.teste.itens.filter((i) => i.forma === 1 && i.habilidade !== 'escrita');
    const msgs = erros(moduloSchema.safeParse(m)).join('\n');
    expect(msgs).toMatch(/2 formas/);
    expect(msgs).toMatch(/sem itens de escrita/);
  });
});
