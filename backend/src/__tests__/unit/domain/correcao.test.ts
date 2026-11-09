import { describe, it, expect } from 'vitest';
import { canonico, corrigir, normalizar, RespostaInvalida, versaoPublica } from '../../../domain/correcao.js';

const item = (tipo: string, conteudo: object, gabarito: object) => ({ tipo, conteudo, gabarito, explicacao: 'porque sim' });

describe('normalizar / canonico', () => {
  it('ignores case, curly apostrophes, extra spaces and final punctuation', () => {
    expect(normalizar('  I’m   HAPPY !! ')).toBe("i'm happy");
  });

  it('expands contractions on both sides', () => {
    expect(canonico("She isn't here.")).toBe(canonico('she is not here'));
    expect(canonico("I don't like it")).toBe('i do not like it');
    expect(canonico("He's a teacher")).toBe('he is a teacher');
    expect(canonico("I can't swim")).toBe(canonico('I cannot swim'));
  });

  it("keeps possessive 's", () => {
    expect(canonico("Anna's book")).toBe("anna's book");
  });

  it('removes the space before punctuation and keeps inner punctuation', () => {
    expect(normalizar('Hello ,  my friend ?!')).toBe('hello, my friend');
    expect(normalizar('a\n\t. b')).toBe('a. b');
  });

  it('stays linear on long runs of spaces and punctuation (ReDoS)', () => {
    const inicio = performance.now();
    normalizar(`x${' '.repeat(50_000)}y`);
    normalizar(`x${'. '.repeat(25_000)}y`);
    normalizar(`x${' .'.repeat(25_000)}`);
    expect(performance.now() - inicio).toBeLessThan(500);
  });
});

describe('corrigir', () => {
  it('mcq', () => {
    const i = item('mcq', { opcoes: ['am', 'is', 'are'] }, { correta: 1 });
    expect(corrigir(i, 1)).toMatchObject({ correto: true, pontuacao: 1, respostaEsperada: 'is' });
    expect(corrigir(i, 0)).toMatchObject({ correto: false, pontuacao: 0, explicacao: 'porque sim' });
  });

  it('cloze with partial credit and the filled sentence as expected answer', () => {
    const i = item('cloze', { texto: 'She ___ a teacher and he ___ a doctor.' }, { respostas: [['is', "'s"], ['is']] });
    expect(corrigir(i, ['is', 'IS '])).toMatchObject({ correto: true, pontuacao: 1 });
    const r = corrigir(i, ['is', 'are']);
    expect(r).toMatchObject({ correto: false, pontuacao: 0.5 });
    expect(r.respostaEsperada).toBe('She is a teacher and he is a doctor.');
  });

  it('does not tolerate a missing third-person -s', () => {
    const i = item('translate', { frase: 'Ela trabalha num banco.', direcao: 'pt-en' }, { aceitas: ['She works in a bank.'] });
    expect(corrigir(i, 'She work in a bank').correto).toBe(false);
    expect(corrigir(i, 'she works in a bank').correto).toBe(true);
  });

  it('word_order', () => {
    const i = item('word_order', { palavras: ['is', 'She', 'a', 'teacher'] }, { aceitas: ['She is a teacher.'] });
    expect(corrigir(i, ['She', 'is', 'a', 'teacher']).correto).toBe(true);
    expect(corrigir(i, ['is', 'She', 'a', 'teacher']).correto).toBe(false);
  });

  it('match with partial credit', () => {
    const i = item('match', { esquerda: ['dog', 'cat', 'bird'], direita: ['gato', 'pássaro', 'cachorro'] }, { pares: [2, 0, 1] });
    expect(corrigir(i, [2, 0, 1])).toMatchObject({ correto: true, pontuacao: 1 });
    expect(corrigir(i, [2, 1, 0])).toMatchObject({ correto: false, pontuacao: 0.33 });
    expect(corrigir(i, [2, 0, 1]).respostaEsperada).toBe('dog → cachorro; cat → gato; bird → pássaro');
  });

  it('error_correction accepts contractions', () => {
    const i = item('error_correction', { frase: 'I have 20 years.' }, { aceitas: ['I am 20.', 'I am 20 years old.'] });
    expect(corrigir(i, "I'm 20").correto).toBe(true);
    expect(corrigir(i, 'I have 20 years').correto).toBe(false);
  });

  it('rejects an empty answer', () => {
    const i = item('translate', { frase: 'Oi', direcao: 'pt-en' }, { aceitas: ['Hi'] });
    expect(corrigir(i, '   ').correto).toBe(false);
  });

  it('throws RespostaInvalida for the wrong answer shape', () => {
    expect(() => corrigir(item('mcq', { opcoes: ['a', 'b'] }, { correta: 0 }), 'a')).toThrow(RespostaInvalida);
    expect(() => corrigir(item('cloze', { texto: '___' }, { respostas: [['a']] }), 'a')).toThrow(RespostaInvalida);
    expect(() => corrigir(item('xyz', {}, {}), 1)).toThrow(RespostaInvalida);
  });
});

describe('versaoPublica', () => {
  it('strips gabarito, explicacao and tagsErro', () => {
    const pub = versaoPublica({ id: 1, tipo: 'mcq', conteudo: {}, gabarito: { correta: 0 }, explicacao: 'x', tagsErro: ['a'] });
    expect(pub).toEqual({ id: 1, tipo: 'mcq', conteudo: {} });
  });
});
