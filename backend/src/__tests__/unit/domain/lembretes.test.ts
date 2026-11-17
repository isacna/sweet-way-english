import { describe, it, expect } from 'vitest';
import { decidirLembrete, diasCorridos, type PerfilLembrete } from '../../../domain/lembretes.js';

// Brasília = UTC-3: 15:00Z é meio-dia; 02:30Z ainda é 23:30 do dia anterior; 03:30Z já é 00:30
const meioDia = (d: string) => new Date(`${d}T15:00:00Z`);
const AGORA = meioDia('2026-03-10');

const perfil = (p: Partial<PerfilLembrete> = {}): PerfilLembrete => ({
  papel: 'aluno',
  lembretesEmail: true,
  ultimoLembreteEm: null,
  ultimoEstudoEm: meioDia('2026-03-09'),
  ofensivaAtual: 4,
  criadoEm: meioDia('2026-01-01'),
  ...p,
});

describe('diasCorridos', () => {
  it.each([
    ['same instant', '2026-03-10T15:00:00Z', '2026-03-10T15:00:00Z', 0],
    ['23:30 and 00:30 in Brasília are different days', '2026-03-10T02:30:00Z', '2026-03-10T03:30:00Z', 1],
    ['00:30 and 23:30 of the same Brasília day', '2026-03-10T03:30:00Z', '2026-03-11T02:30:00Z', 0],
    ['a week', '2026-03-03T15:00:00Z', '2026-03-10T15:00:00Z', 7],
    ['across a month', '2026-02-27T15:00:00Z', '2026-03-02T15:00:00Z', 3],
  ])('%s', (_nome, de, ate, esperado) => {
    expect(diasCorridos(new Date(de), new Date(ate))).toBe(esperado);
  });
});

describe('decidirLembrete', () => {
  it.each<[string, Partial<PerfilLembrete>, Date, ReturnType<typeof decidirLembrete>]>([
    // ── ofensiva em risco ──
    ['streak 4, studied yesterday, not today', {}, AGORA, { tipo: 'ofensiva', dias: 4 }],
    ['streak 2 is enough', { ofensivaAtual: 2 }, AGORA, { tipo: 'ofensiva', dias: 2 }],
    ['streak 1 is not a streak yet', { ofensivaAtual: 1 }, AGORA, null],
    ['already studied today', { ultimoEstudoEm: meioDia('2026-03-10') }, AGORA, null],
    [
      'studied at 23:30 yesterday (Brasília), now 00:30: at risk',
      { ultimoEstudoEm: new Date('2026-03-10T02:30:00Z') },
      new Date('2026-03-10T03:30:00Z'),
      { tipo: 'ofensiva', dias: 4 },
    ],
    [
      'studied at 00:30 today (Brasília), now 23:30: same day',
      { ultimoEstudoEm: new Date('2026-03-10T03:30:00Z') },
      new Date('2026-03-11T02:30:00Z'),
      null,
    ],
    ['streak already broken (2 days ago)', { ultimoEstudoEm: meioDia('2026-03-08') }, AGORA, null],

    // ── sentimos sua falta ──
    ['3 days without studying', { ultimoEstudoEm: meioDia('2026-03-07') }, AGORA, { tipo: 'saudade', dias: 3 }],
    ['7 days without studying', { ultimoEstudoEm: meioDia('2026-03-03') }, AGORA, { tipo: 'saudade', dias: 7 }],
    ['4 days: no nagging', { ultimoEstudoEm: meioDia('2026-03-06') }, AGORA, null],
    ['6 days: no nagging', { ultimoEstudoEm: meioDia('2026-03-04') }, AGORA, null],
    ['8 days: nothing more', { ultimoEstudoEm: meioDia('2026-03-02') }, AGORA, null],
    ['30 days: nothing more', { ultimoEstudoEm: meioDia('2026-02-08') }, AGORA, null],
    [
      '3 days counted by the Brasília calendar (23:30 on the 6th UTC-3 = the 7th in UTC)',
      { ultimoEstudoEm: new Date('2026-03-07T02:30:00Z') },
      AGORA,
      null, // dia 6 em Brasília: 4 dias
    ],
    ['the streak size does not matter for "saudade"', { ultimoEstudoEm: meioDia('2026-03-07'), ofensivaAtual: 0 }, AGORA, { tipo: 'saudade', dias: 3 }],

    // ── nunca estudou ──
    ['never studied, profile created 3 days ago', { ultimoEstudoEm: null, ofensivaAtual: 0, criadoEm: meioDia('2026-03-07') }, AGORA, { tipo: 'primeira-licao' }],
    ['never studied, created 2 days ago', { ultimoEstudoEm: null, criadoEm: meioDia('2026-03-08') }, AGORA, null],
    ['never studied, created 4 days ago', { ultimoEstudoEm: null, criadoEm: meioDia('2026-03-06') }, AGORA, null],
    ['never studied, created 7 days ago: only one invitation', { ultimoEstudoEm: null, criadoEm: meioDia('2026-03-03') }, AGORA, null],
    ['never studied, created today', { ultimoEstudoEm: null, criadoEm: AGORA }, AGORA, null],

    // ── opt-in, papel e um por dia ──
    ['reminders off', { lembretesEmail: false }, AGORA, null],
    ['reminders off, 3 days away', { lembretesEmail: false, ultimoEstudoEm: meioDia('2026-03-07') }, AGORA, null],
    ['not a student', { papel: 'professor' }, AGORA, null],
    ['already reminded today', { ultimoLembreteEm: new Date('2026-03-10T11:00:00Z') }, AGORA, null],
    ['reminded yesterday: allowed again', { ultimoLembreteEm: meioDia('2026-03-09') }, AGORA, { tipo: 'ofensiva', dias: 4 }],
    [
      'reminded at 23:59 yesterday (Brasília), now 00:01',
      { ultimoLembreteEm: new Date('2026-03-10T02:59:00Z') },
      new Date('2026-03-10T03:01:00Z'),
      { tipo: 'ofensiva', dias: 4 },
    ],
    [
      'reminded at 00:01 today (Brasília), now 23:59',
      { ultimoLembreteEm: new Date('2026-03-10T03:01:00Z') },
      new Date('2026-03-11T02:59:00Z'),
      null,
    ],
    ['a reminder stamped in the future (clock skew) also blocks', { ultimoLembreteEm: meioDia('2026-03-11') }, AGORA, null],
  ])('%s', (_nome, mudancas, agora, esperado) => {
    expect(decidirLembrete(perfil(mudancas), agora)).toEqual(esperado);
  });
});
