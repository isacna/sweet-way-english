import { describe, it, expect } from 'vitest';
import { atualizarOfensiva, avaliarTeste, ofensivaVigente, proximaRevisao, CAIXA_MAXIMA } from '../../../domain/progresso.js';

// 15:00 UTC = 12:00 em Brasília
const dia = (d: string) => new Date(`${d}T15:00:00Z`);

describe('proximaRevisao', () => {
  it('moves up a box on a hit and schedules by the box interval', () => {
    const r = proximaRevisao(1, true, dia('2026-01-01'));
    expect(r.caixa).toBe(2);
    expect(r.proximaEm.toISOString().slice(0, 10)).toBe('2026-01-03');
  });

  it('caps at the last box', () => {
    expect(proximaRevisao(CAIXA_MAXIMA, true).caixa).toBe(CAIXA_MAXIMA);
  });

  it('goes back to box 1, due now, on a miss', () => {
    const agora = dia('2026-01-01');
    expect(proximaRevisao(4, false, agora)).toEqual({ caixa: 1, proximaEm: agora });
  });
});

describe('ofensiva', () => {
  const base = { ofensivaAtual: 3, ofensivaMaxima: 5 };

  it('starts at 1', () => {
    expect(atualizarOfensiva({ ...base, ofensivaAtual: 0, ultimoEstudoEm: null }).ofensivaAtual).toBe(1);
  });

  it('keeps the value on the same day', () => {
    expect(atualizarOfensiva({ ...base, ultimoEstudoEm: dia('2026-01-01') }, dia('2026-01-01')).ofensivaAtual).toBe(3);
  });

  it('increments on the next day and updates the max', () => {
    const r = atualizarOfensiva({ ...base, ofensivaAtual: 5, ultimoEstudoEm: dia('2026-01-01') }, dia('2026-01-02'));
    expect(r).toMatchObject({ ofensivaAtual: 6, ofensivaMaxima: 6 });
  });

  it('resets after a missed day', () => {
    expect(atualizarOfensiva({ ...base, ultimoEstudoEm: dia('2026-01-01') }, dia('2026-01-03')).ofensivaAtual).toBe(1);
  });

  it('uses the Brasília day, not UTC', () => {
    // 23:30 em Brasília do dia 1 = 02:30 UTC do dia 2; estudar às 10:00 do dia 2 é o dia seguinte
    const r = atualizarOfensiva({ ...base, ultimoEstudoEm: new Date('2026-01-02T02:30:00Z') }, new Date('2026-01-02T13:00:00Z'));
    expect(r.ofensivaAtual).toBe(4);
  });

  it('shows 0 when the streak is broken', () => {
    expect(ofensivaVigente({ ofensivaAtual: 7, ultimoEstudoEm: dia('2026-01-01') }, dia('2026-01-05'))).toBe(0);
    expect(ofensivaVigente({ ofensivaAtual: 7, ultimoEstudoEm: dia('2026-01-01') }, dia('2026-01-02'))).toBe(7);
  });
});

describe('avaliarTeste', () => {
  it('passes with ≥75% overall and ≥60% per skill', () => {
    const r = avaliarTeste([
      ...Array(8).fill({ habilidade: 'gramatica_vocabulario', pontuacao: 1 }),
      { habilidade: 'leitura', pontuacao: 1 },
      { habilidade: 'leitura', pontuacao: 0 },
      { habilidade: 'escrita', pontuacao: 1 },
    ]);
    expect(r.porHabilidade).toEqual({ gramatica_vocabulario: 100, leitura: 50, escrita: 100 });
    expect(r.percentual).toBe(91);
    expect(r.aprovado).toBe(false); // leitura < 60
  });

  it('fails below 75% overall', () => {
    const r = avaliarTeste([
      { habilidade: 'a', pontuacao: 1 },
      { habilidade: 'a', pontuacao: 0.4 },
      { habilidade: 'b', pontuacao: 0.7 },
      { habilidade: 'b', pontuacao: 0.7 },
    ]);
    expect(r).toMatchObject({ percentual: 70, porHabilidade: { a: 70, b: 70 }, aprovado: false });
  });

  it('passes at exactly 75% with every skill ≥60%', () => {
    const r = avaliarTeste([
      { habilidade: 'a', pontuacao: 1 },
      { habilidade: 'a', pontuacao: 0.5 },
      { habilidade: 'b', pontuacao: 1 },
      { habilidade: 'b', pontuacao: 0.5 },
    ]);
    expect(r).toMatchObject({ percentual: 75, aprovado: true });
  });
});
