import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { criarLogger, nivelPadrao } from '../../../config/logger.js';
import { logRequisicoes } from '../../../http/middlewares/log.js';
import { errorHandler } from '../../../http/middlewares/errorHandler.js';

/** Logger de verdade (nível info) escrevendo numa lista de linhas JSON. */
function capturar() {
  const linhas: string[] = [];
  const destino = new Writable({
    write(chunk, _enc, cb) {
      linhas.push(...String(chunk).split('\n').filter(Boolean));
      cb();
    },
  });
  return { logger: criarLogger(destino, 'info'), linhas, objetos: () => linhas.map((l) => JSON.parse(l)) };
}

function montar(log: ReturnType<typeof capturar>['logger']) {
  const app = express();
  app.use(logRequisicoes(log));
  app.use(express.json());
  app.post('/api/coisa', (_req, res) => res.status(201).json({ ok: true }));
  app.get('/api/falha', () => {
    throw new Error('quebrou');
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(errorHandler);
  return app;
}

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.segredo-do-token';
const COOKIE = 'sw_sessao=valor-secreto-do-cookie';

describe('request logging (pino-http)', () => {
  it('logs id, method, path, status and duration — and nothing from headers, body or query string', async () => {
    const cap = capturar();
    const r = await request(montar(cap.logger))
      .post('/api/coisa?email=ana@exemplo.com')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('Cookie', COOKIE)
      .send({ senha: 'senha-super-secreta', nome: 'Ana Pessoa' });
    expect(r.status).toBe(201);

    const texto = cap.linhas.join('\n');
    for (const segredo of [TOKEN, 'valor-secreto-do-cookie', 'senha-super-secreta', 'Ana Pessoa', 'ana@exemplo.com']) {
      expect(texto).not.toContain(segredo);
    }
    expect(texto.toLowerCase()).not.toContain('authorization');
    expect(texto.toLowerCase()).not.toContain('cookie');

    const [linha] = cap.objetos();
    expect(linha).toMatchObject({
      level: 30,
      req: { method: 'POST', path: '/api/coisa' },
      res: { status: 201 },
      msg: 'POST /api/coisa 201',
    });
    expect(typeof linha.duracaoMs).toBe('number');
    expect(linha.req.id).toBe(r.headers['x-request-id']);
    expect(Object.keys(linha.req).sort()).toEqual(['id', 'method', 'path']);
  });

  it('honours a safe X-Request-Id and replaces an unsafe one', async () => {
    const cap = capturar();
    const app = montar(cap.logger);
    const a = await request(app).post('/api/coisa').set('X-Request-Id', 'proxy-123.abc');
    expect(a.headers['x-request-id']).toBe('proxy-123.abc');
    const b = await request(app).post('/api/coisa').set('X-Request-Id', 'mau<script>ç');
    expect(b.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(cap.objetos().map((l) => l.req.id)).toEqual(['proxy-123.abc', b.headers['x-request-id']]);
  });

  it('logs a 500 at error level with the stack, tied to the request id', async () => {
    const cap = capturar();
    const r = await request(montar(cap.logger)).get('/api/falha');
    expect(r.status).toBe(500);
    const linhas = cap.objetos();
    const erro = linhas.find((l) => l.msg === 'Erro não tratado');
    expect(erro).toMatchObject({ level: 50, reqId: r.headers['x-request-id'] });
    expect(erro.err.stack).toContain('quebrou');
    expect(linhas.find((l) => l.msg === 'GET /api/falha 500')).toMatchObject({ level: 50 });
  });

  it('does not log successful health checks', async () => {
    const cap = capturar();
    await request(montar(cap.logger)).get('/api/health');
    expect(cap.linhas).toEqual([]);
  });

  it('redacts authorization, cookie and password fields even when logged directly', () => {
    const cap = capturar();
    cap.logger.info({ req: { headers: { authorization: `Bearer ${TOKEN}`, cookie: COOKIE } }, dados: { senha: 'x1', token: 'x2' } });
    const texto = cap.linhas.join('\n');
    expect(texto).not.toContain(TOKEN);
    expect(texto).not.toContain('valor-secreto-do-cookie');
    expect(texto).not.toContain('x1');
    expect(texto).not.toContain('x2');
    expect(texto).toContain('[oculto]');
  });

  it('is silent under NODE_ENV=test', () => {
    expect(nivelPadrao()).toBe('silent');
  });
});
