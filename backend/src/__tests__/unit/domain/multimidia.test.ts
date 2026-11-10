import { describe, expect, it } from 'vitest';
import { midiaSchema } from '../../../domain/conteudo/midia.js';
import { itemSchema, type LicaoConteudo } from '../../../domain/conteudo/schema.js';
import { corrigir, versaoPublica } from '../../../domain/correcao.js';
import { auditarDiversidade, planejarPiloto, TAG_PILOTO } from '../../../domain/conteudo/pilotos.js';
import { lerModulos } from '../../../domain/conteudo/arquivos.js';

const midia = { tipo: 'audio', modo: 'voz', titulo: 'No café', fonte: 'Original', orientacao: 'Ouça.', transcricao: 'A tea, please.' };
const sequence = { tipo: 'sequence', enunciado: 'Ordene.', explicacao: 'Primeiro, peça.', conteudo: { trechos: ['Pay.', 'Order.', 'Eat.'], midia }, gabarito: { ordem: [1, 2, 0] } };

describe('mídia e sequência', () => {
  it('valida roteiro de escuta e mantém a mídia na versão pública sem gabarito', () => {
    const item = itemSchema.parse(sequence);
    const publico = versaoPublica(item);
    expect(publico.conteudo.midia).toEqual(midia);
    expect(publico).not.toHaveProperty('gabarito');
  });
  it('rejeita URLs inseguras, IDs inválidos e trechos invertidos', () => {
    for (const url of ['javascript:alert(1)', 'http://example.com/a.mp3', 'https://user:pass@example.com/a.mp3']) expect(midiaSchema.safeParse({ ...midia, modo: 'arquivo', url }).success).toBe(false);
    expect(midiaSchema.safeParse({ ...midia, modo: 'youtube', tipo: 'video', url: 'https://youtube.com/watch?v=bad' }).success).toBe(false);
    expect(midiaSchema.safeParse({ ...midia, modo: 'arquivo', url: 'https://example.com/a.mp3', inicio: 20, fim: 10 }).success).toBe(false);
    expect(midiaSchema.safeParse({ ...midia, modo: 'arquivo', url: 'https://example.com/a.mp3', transcricao: undefined }).success).toBe(false);
  });
  it('valida permutação e corrige a sequência completa, sem aprovar respostas parciais', () => {
    expect(itemSchema.safeParse(sequence).success).toBe(true);
    expect(itemSchema.safeParse({ ...sequence, gabarito: { ordem: [1, 1, 0] } }).success).toBe(false);
    expect(corrigir(sequence, [1, 2, 0]).correto).toBe(true);
    expect(corrigir(sequence, [0, 1, 2]).correto).toBe(false);
    expect(corrigir(sequence, []).pontuacao).toBe(0);
    expect(corrigir(sequence, [1, 2]).correto).toBe(false);
    expect(() => corrigir(sequence, [1, 1, 0])).toThrow();
    expect(() => corrigir(sequence, [1, 2, 3])).toThrow();
  });
});

describe('pilotos', () => {
  const licoes = lerModulos().flatMap((a) => a.modulo?.licoes ?? []).filter((l) => l.exercicios.some((e) => e.tagsErro?.includes(TAG_PILOTO)));
  it('contém 18 missões, 36 exercícios novos e gabaritos válidos', () => {
    expect(licoes).toHaveLength(18);
    const novos = licoes.flatMap((l) => l.exercicios.filter((e) => e.tagsErro?.includes(TAG_PILOTO)));
    expect(novos).toHaveLength(36);
    for (const l of licoes) expect(l.apresentacao.missao?.criterios.length).toBeGreaterThanOrEqual(2);
    for (const e of novos) {
      expect(itemSchema.safeParse(e).success).toBe(true);
      if (e.tipo === 'sequence') expect(corrigir(e, e.gabarito.ordem).correto).toBe(true);
      if (e.tipo === 'mcq') expect(corrigir(e, e.gabarito.correta).correto).toBe(true);
    }
  });
  it('atualização aditiva é idempotente e preserva a apresentação editada', () => {
    const l = licoes[0];
    const atual = { explicacao: ['Texto da professora'], missao: { titulo: 'Missão editada' } };
    const plano = planejarPiloto(l, [{ ordem: 40, tagsErro: [] }], atual);
    expect(plano.novos).toHaveLength(2);
    expect(plano.ordemInicial).toBe(41);
    expect(plano.apresentacao).toMatchObject({ explicacao: atual.explicacao });
    expect(plano.apresentacao.missao).toEqual(atual.missao);
    const segunda = planejarPiloto(l, plano.novos.map((e, i) => ({ ordem: 41 + i, tagsErro: e.tagsErro })), plano.apresentacao);
    expect(segunda.novos).toEqual([]);
    expect(segunda.apresentacao).toEqual(plano.apresentacao);
  });
  it('auditoria sinaliza repetição e ausência de produção pessoal', () => {
    const l = { ...licoes[0], apresentacao: { explicacao: ['Texto'], exemplos: [] } } as LicaoConteudo;
    const avisos = auditarDiversidade([l, { ...l, slug: 'copia-2' }, { ...l, slug: 'copia-3' }]);
    expect(avisos.some((a) => a.includes('Sequência idêntica'))).toBe(true);
    expect(avisos.some((a) => a.includes('sem missão'))).toBe(true);
  });
});
