import { describe, expect, it } from 'vitest';
import { midiaSchema } from '../../../domain/conteudo/midia.js';
import { itemSchema, type LicaoConteudo } from '../../../domain/conteudo/schema.js';
import { corrigir, versaoPublica } from '../../../domain/correcao.js';
import { auditarDiversidade, MODULOS_PILOTO, planejarPiloto, TAG_PILOTO, TAG_PILOTO_DITADO } from '../../../domain/conteudo/pilotos.js';
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
  it('piloto de ditado: um item por lição de A1-M01 e A1-M02, na prática semicontrolada, com frase da apresentação', () => {
    const modulos = lerModulos().map((a) => a.modulo!).filter((m) => ['a1-m01', 'a1-m02'].includes(m.slug));
    expect(modulos).toHaveLength(2);
    for (const m of modulos) {
      expect(MODULOS_PILOTO).toContain(m.slug);
      expect(m.teste.itens.some((i) => i.tipo === 'dictation')).toBe(false);
      for (const l of m.licoes) {
        const ditados = l.exercicios.filter((e) => e.tipo === 'dictation');
        expect(ditados, l.slug).toHaveLength(1);
        const [d] = ditados;
        if (d.tipo !== 'dictation') throw new Error('tipo');
        expect(d.etapa).toBe('semicontrolada');
        expect(d.tagsErro).toEqual([TAG_PILOTO_DITADO, `piloto:${l.slug}:ditado`]);
        expect(l.apresentacao.exemplos.some((x) => x.en.includes(d.conteudo.frase)), `${l.slug}: frase ensinada`).toBe(true);
        for (const a of [d.conteudo.frase, ...d.gabarito.aceitas]) expect(corrigir(d, a).correto).toBe(true);
        expect(corrigir(d, d.conteudo.frase).respostaEsperada).toBe(d.conteudo.frase);
      }
    }
  });
  it('ditado entra na atualização aditiva uma única vez, depois dos exercícios existentes', () => {
    const l = lerModulos(undefined, ['m01']).find((a) => a.nivel === 'A1')!.modulo!.licoes[0];
    const plano = planejarPiloto(l, [{ ordem: 15, tagsErro: ['artigo_nome'] }], { explicacao: ['Texto da professora'] });
    expect(plano.novos.map((e) => e.tipo)).toEqual(['dictation']);
    expect(plano.ordemInicial).toBe(16);
    expect(plano.apresentacao).toEqual({ explicacao: ['Texto da professora'] });
    expect(planejarPiloto(l, [{ ordem: 16, tagsErro: plano.novos[0].tagsErro }], plano.apresentacao).novos).toEqual([]);
  });
  it('auditoria sinaliza repetição e ausência de produção pessoal', () => {
    const l = { ...licoes[0], apresentacao: { explicacao: ['Texto'], exemplos: [] } } as LicaoConteudo;
    const avisos = auditarDiversidade([l, { ...l, slug: 'copia-2' }, { ...l, slug: 'copia-3' }]);
    expect(avisos.some((a) => a.includes('Sequência idêntica'))).toBe(true);
    expect(avisos.some((a) => a.includes('sem missão'))).toBe(true);
  });
});
