import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const prismaMock = vi.hoisted(() => ({
  perfilAprendiz: { findMany: vi.fn(), updateMany: vi.fn() },
  usuario: { findUnique: vi.fn() },
}));
const enviarEmailMock = vi.hoisted(() => vi.fn());

vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));
vi.mock('../../../email/index.js', () => ({ enviarEmail: enviarEmailMock }));

import {
  cancelarLembretes,
  enviarLembretes,
  lerTokenCancelar,
  linkCancelarLembretes,
  tokenCancelarLembretes,
} from '../../../services/lembretes.js';
import { ErroValidacao } from '../../../services/erros.js';
import { authenticateToken } from '../../../http/middlewares/auth.js';
import { env } from '../../../config/env.js';
import { mockRes } from '../../helpers/mockReqRes.js';

// 15:00Z = meio-dia em Brasília
const meioDia = (d: string) => new Date(`${d}T15:00:00Z`);
const AGORA = meioDia('2026-03-10');

const linha = (id: number, p: Record<string, unknown> = {}) => ({
  id,
  usuarioId: id + 100,
  lembretesEmail: true,
  ultimoLembreteEm: null as Date | null,
  ultimoEstudoEm: meioDia('2026-03-09') as Date | null,
  ofensivaAtual: 5,
  criadoEm: meioDia('2026-01-01'),
  usuario: { nome: 'Ana Souza', email: `aluno${id}@t.com`, papel: 'aluno' },
  ...p,
});

describe('services/lembretes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.perfilAprendiz.updateMany.mockResolvedValue({ count: 1 });
    enviarEmailMock.mockResolvedValue(undefined);
  });

  describe('token de cancelamento', () => {
    it('round-trips the user id', () => {
      expect(lerTokenCancelar(tokenCancelarLembretes(42))).toBe(42);
    });

    it('is purpose-scoped and long-lived', () => {
      const p = jwt.decode(tokenCancelarLembretes(42)) as { tipo: string; id: number; exp: number; iat: number; v?: number };
      expect(p).toMatchObject({ tipo: 'cancelar-lembretes', id: 42 });
      expect(p.v).toBeUndefined();
      expect(p.exp - p.iat).toBeGreaterThanOrEqual(300 * 24 * 3600);
    });

    it.each([
      ['garbage', 'abc'],
      ['a session token (no tipo)', jwt.sign({ id: 42, email: 'a@t.com', role: 'aluno', v: 0 }, env.JWT_SECRET, { expiresIn: '7d' })],
      ['another purpose', jwt.sign({ tipo: 'outra-coisa', id: 42 }, env.JWT_SECRET, { expiresIn: '7d' })],
      ['another secret', jwt.sign({ tipo: 'cancelar-lembretes', id: 42 }, 'outro-segredo-qualquer-123', { expiresIn: '7d' })],
      ['expired', jwt.sign({ tipo: 'cancelar-lembretes', id: 42 }, env.JWT_SECRET, { expiresIn: -10 })],
      ['a non-numeric id', jwt.sign({ tipo: 'cancelar-lembretes', id: '42' }, env.JWT_SECRET, { expiresIn: '7d' })],
      ['unsigned (alg none)', jwt.sign({ tipo: 'cancelar-lembretes', id: 42 }, '', { algorithm: 'none' })],
    ])('rejects %s', (_nome, token) => {
      expect(lerTokenCancelar(token)).toBeNull();
    });

    it('cannot be used as a session', async () => {
      const res = mockRes() as any;
      const next = vi.fn();
      await authenticateToken(
        { headers: { authorization: `Bearer ${tokenCancelarLembretes(42)}` } } as any,
        res,
        next,
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
    });

    it('builds the link to the public page', () => {
      const link = linkCancelarLembretes(42);
      expect(link.startsWith(`${env.frontendUrl}/lembretes/cancelar?token=`)).toBe(true);
      expect(lerTokenCancelar(new URL(link).searchParams.get('token')!)).toBe(42);
    });
  });

  describe('cancelarLembretes', () => {
    it('turns the reminders off for the token owner', async () => {
      await cancelarLembretes(tokenCancelarLembretes(42));
      expect(prismaMock.perfilAprendiz.updateMany).toHaveBeenCalledWith({
        where: { usuarioId: 42 },
        data: { lembretesEmail: false },
      });
    });

    it('answers the same way when there is no profile anymore', async () => {
      prismaMock.perfilAprendiz.updateMany.mockResolvedValue({ count: 0 });
      await expect(cancelarLembretes(tokenCancelarLembretes(42))).resolves.toBeUndefined();
    });

    it('throws 400 for an invalid token, without touching the database', async () => {
      await expect(cancelarLembretes('nada')).rejects.toBeInstanceOf(ErroValidacao);
      expect(prismaMock.perfilAprendiz.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('enviarLembretes', () => {
    it('selects only opted-in students', async () => {
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([]);
      const r = await enviarLembretes({ agora: AGORA, pausaMs: 0 });
      const where = prismaMock.perfilAprendiz.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ lembretesEmail: true, usuario: { papel: 'aluno' } });
      expect(r).toMatchObject({ candidatos: 0, enviados: 0, falhas: 0, semProvedor: false });
      expect(enviarEmailMock).not.toHaveBeenCalled();
    });

    it('sends one e-mail per due profile, of the right kind, and stamps it', async () => {
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([
        linha(1), // ofensiva em risco
        linha(2, { ultimoEstudoEm: meioDia('2026-03-07') }), // 3 dias
        linha(3, { ultimoEstudoEm: null, criadoEm: meioDia('2026-03-07') }), // nunca estudou
        linha(4, { ultimoEstudoEm: meioDia('2026-03-10') }), // estudou hoje
        linha(5, { ultimoLembreteEm: new Date('2026-03-10T11:00:00Z') }), // já recebeu hoje
        linha(6, { ultimoEstudoEm: meioDia('2026-03-05') }), // 5 dias
      ]);

      const r = await enviarLembretes({ agora: AGORA, pausaMs: 0 });

      expect(r).toMatchObject({ candidatos: 6, enviados: 3, falhas: 0 });
      expect(r.lista.map((p) => [p.usuarioId, p.lembrete.tipo])).toEqual([
        [101, 'ofensiva'],
        [102, 'saudade'],
        [103, 'primeira-licao'],
      ]);
      expect(enviarEmailMock).toHaveBeenCalledTimes(3);
      const [ofensiva, saudade, primeira] = enviarEmailMock.mock.calls.map((c) => c[0]);
      expect(ofensiva.para).toBe('aluno1@t.com');
      expect(ofensiva.assunto).toMatch(/ofensiva de 5 dias/);
      expect(saudade.assunto).toMatch(/Sentimos sua falta/);
      expect(saudade.texto).toMatch(/Faz 3 dias/);
      expect(primeira.assunto).toMatch(/primeira lição/);

      // Reserva condicional antes do envio, só para os três
      expect(prismaMock.perfilAprendiz.updateMany).toHaveBeenCalledTimes(3);
      expect(prismaMock.perfilAprendiz.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 1, lembretesEmail: true, ultimoLembreteEm: null },
        data: { ultimoLembreteEm: AGORA },
      });
    });

    it('every e-mail links to the panel and carries the unsubscribe link (body and headers)', async () => {
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([linha(1)]);
      await enviarLembretes({ agora: AGORA, pausaMs: 0 });

      const msg = enviarEmailMock.mock.calls[0][0];
      for (const corpo of [msg.texto, msg.html]) {
        expect(corpo).toContain(`${env.frontendUrl}/aluno`);
        expect(corpo).toContain(`${env.frontendUrl}/lembretes/cancelar?token=`);
      }
      expect(msg.texto).toMatch(/^Oi, Ana!/);
      const token = /lembretes\/cancelar\?token=([\w.-]+)/.exec(msg.texto)![1];
      expect(lerTokenCancelar(token)).toBe(101);

      expect(msg.cabecalhos['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      const url = /^<(.+)>$/.exec(msg.cabecalhos['List-Unsubscribe'])![1];
      expect(url.startsWith(`${env.frontendUrl}/api/lembretes/cancelar?token=`)).toBe(true);
      expect(lerTokenCancelar(new URL(url).searchParams.get('token')!)).toBe(101);
    });

    it('escapes the name in the HTML', async () => {
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([linha(1, { usuario: { nome: '<b>Zé</b>', email: 'z@t.com', papel: 'aluno' } })]);
      await enviarLembretes({ agora: AGORA, pausaMs: 0 });
      const msg = enviarEmailMock.mock.calls[0][0];
      expect(msg.html).not.toContain('<b>Zé</b>');
      expect(msg.html).toContain('&lt;b&gt;Zé&lt;/b&gt;');
    });

    it('--simular lists who would get what without sending or stamping', async () => {
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([linha(1), linha(2, { ultimoEstudoEm: meioDia('2026-03-03') })]);
      const r = await enviarLembretes({ agora: AGORA, simular: true });
      expect(r).toMatchObject({ simulacao: true, enviados: 2 });
      expect(r.lista).toEqual([
        { usuarioId: 101, email: 'aluno1@t.com', lembrete: { tipo: 'ofensiva', dias: 5 } },
        { usuarioId: 102, email: 'aluno2@t.com', lembrete: { tipo: 'saudade', dias: 7 } },
      ]);
      expect(enviarEmailMock).not.toHaveBeenCalled();
      expect(prismaMock.perfilAprendiz.updateMany).not.toHaveBeenCalled();
    });

    it('skips a profile another run already took (or that just opted out)', async () => {
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([linha(1), linha(2)]);
      prismaMock.perfilAprendiz.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValue({ count: 1 });
      const r = await enviarLembretes({ agora: AGORA, pausaMs: 0 });
      expect(r).toMatchObject({ enviados: 1, falhas: 0 });
      expect(enviarEmailMock).toHaveBeenCalledTimes(1);
      expect(enviarEmailMock.mock.calls[0][0].para).toBe('aluno2@t.com');
    });

    it('a failed send is counted, undoes the stamp and does not stop the others', async () => {
      const antes = meioDia('2026-03-08');
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([linha(1, { ultimoLembreteEm: antes }), linha(2)]);
      enviarEmailMock.mockRejectedValueOnce(new Error('Resend respondeu 500')).mockResolvedValue(undefined);

      const r = await enviarLembretes({ agora: AGORA, pausaMs: 0 });

      expect(r).toMatchObject({ enviados: 1, falhas: 1 });
      expect(r.lista.map((p) => p.usuarioId)).toEqual([102]);
      expect(prismaMock.perfilAprendiz.updateMany).toHaveBeenCalledWith({
        where: { id: 1, ultimoLembreteEm: AGORA },
        data: { ultimoLembreteEm: antes },
      });
    });

    it('never sends to a professor, even if the query returned one', async () => {
      prismaMock.perfilAprendiz.findMany.mockResolvedValue([linha(1, { usuario: { nome: 'P', email: 'p@t.com', papel: 'professor' } })]);
      const r = await enviarLembretes({ agora: AGORA, pausaMs: 0 });
      expect(r.enviados).toBe(0);
      expect(enviarEmailMock).not.toHaveBeenCalled();
    });

    it('in production without an e-mail provider nothing is sent or stamped', async () => {
      const antes = { NODE_ENV: env.NODE_ENV, RESEND_API_KEY: env.RESEND_API_KEY };
      Object.assign(env, { NODE_ENV: 'production', RESEND_API_KEY: undefined });
      try {
        const r = await enviarLembretes({ agora: AGORA, pausaMs: 0 });
        expect(r).toMatchObject({ semProvedor: true, enviados: 0 });
        expect(prismaMock.perfilAprendiz.findMany).not.toHaveBeenCalled();
        expect(enviarEmailMock).not.toHaveBeenCalled();
      } finally {
        Object.assign(env, antes);
      }
    });
  });
});
