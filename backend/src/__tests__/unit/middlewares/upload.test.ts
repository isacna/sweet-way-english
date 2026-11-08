import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express, { type Request, type Response } from 'express';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const prismaMock = vi.hoisted(() => ({ $transaction: vi.fn(), arquivo: { create: vi.fn() } }));
vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import { env } from '../../../config/env.js';
import { arquivoRecebido, receberArquivo, salvarArquivoRecebido } from '../../../http/middlewares/upload.js';
import { errorHandler } from '../../../http/middlewares/errorHandler.js';
import { h } from '../../../http/asyncHandler.js';
import { FIXTURES } from '../../helpers/fixturesArquivos.js';

/** App mínimo: receberArquivo + um controller de teste + o errorHandler real. */
function montar(controller: (req: Request, res: Response) => unknown, opcoes?: { somenteImagem?: boolean }) {
  const app = express();
  app.post('/up', receberArquivo('arquivo', opcoes), h(controller));
  app.use(errorHandler);
  return app;
}

describe('receberArquivo + salvarArquivoRecebido (limpeza do disco)', () => {
  let pasta = '';
  let original = '';
  const arquivosNaPasta = () => (fs.existsSync(pasta) ? fs.readdirSync(pasta) : []);

  beforeAll(() => {
    original = env.UPLOAD_DIR;
    pasta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-upload-')), 'uploads');
    (env as { UPLOAD_DIR: string }).UPLOAD_DIR = pasta;
  });
  afterAll(() => {
    (env as { UPLOAD_DIR: string }).UPLOAD_DIR = original;
    fs.rmSync(path.dirname(pasta), { recursive: true, force: true });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    fs.rmSync(pasta, { recursive: true, force: true });
    prismaMock.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prismaMock));
    prismaMock.arquivo.create.mockImplementation(async ({ data }: { data: object }) => ({ id: 'novo', ...data }));
  });

  it('entrega o arquivo conferido ao controller, sem gravar nada ainda', async () => {
    let visto: unknown = null;
    const app = montar((req, res) => {
      visto = arquivoRecebido(req);
      res.status(204).end();
    });
    await request(app).post('/up').attach('arquivo', FIXTURES.png, { filename: 'Fóto.png', contentType: 'image/png' }).expect(204);
    expect(visto).toMatchObject({ nomeOriginal: 'Fóto.png', mime: 'image/png', ext: 'png', tamanho: FIXTURES.png.length });
    expect(arquivosNaPasta()).toEqual([]);
  });

  it('sem arquivo (ou corpo JSON) segue normalmente', async () => {
    const app = montar((req, res) => res.json({ tem: arquivoRecebido(req) !== null }));
    const r = await request(app).post('/up').send({ a: 1 });
    expect(r.body).toEqual({ tem: false });
  });

  it('415 para .exe renomeado, antes de chegar ao controller', async () => {
    const controller = vi.fn();
    const app = montar(controller);
    const r = await request(app).post('/up').attach('arquivo', FIXTURES.exe, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(415);
    expect(controller).not.toHaveBeenCalled();
    expect(arquivosNaPasta()).toEqual([]);
  });

  it('413 acima de UPLOAD_MAX_MB', async () => {
    const app = montar((_req, res) => res.status(204).end());
    const grande = Buffer.concat([FIXTURES.pdf, Buffer.alloc(env.UPLOAD_MAX_MB * 1024 * 1024)]);
    const r = await request(app).post('/up').attach('arquivo', grande, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(413);
  });

  it('controller que recusa (403/404/400) não deixa arquivo no disco', async () => {
    for (const status of [400, 403, 404]) {
      const app = montar((_req, res) => res.status(status).json({ error: 'não' }));
      await request(app).post('/up').attach('arquivo', FIXTURES.pdf, { filename: 'a.pdf', contentType: 'application/pdf' }).expect(status);
    }
    expect(arquivosNaPasta()).toEqual([]);
  });

  it('sucesso: grava com nome aleatório e cria o Arquivo do dono na mesma transação', async () => {
    const app = montar(async (req, res) => {
      const r = await salvarArquivoRecebido(req, 42, async (_tx, arquivo) => arquivo);
      res.status(201).json(r);
    });
    const r = await request(app).post('/up').attach('arquivo', FIXTURES.pdf, { filename: 'Lição.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ donoId: 42, nomeOriginal: 'Lição.pdf', mime: 'application/pdf', tamanho: FIXTURES.pdf.length });
    expect(arquivosNaPasta()).toEqual([r.body.caminho]);
  });

  it('erro depois de gravar (transação falha): 500 e o arquivo sai do disco', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = montar(async (req, res) => {
      await salvarArquivoRecebido(req, 42, async () => {
        throw new Error('FK violada');
      });
      res.status(201).end();
    });
    const r = await request(app).post('/up').attach('arquivo', FIXTURES.pdf, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(500);
    expect(arquivosNaPasta()).toEqual([]);
  });

  it('somenteImagem (logo) recusa PDF com 415', async () => {
    const app = montar((_req, res) => res.status(204).end(), { somenteImagem: true });
    const r = await request(app).post('/up').attach('arquivo', FIXTURES.pdf, { filename: 'logo.png', contentType: 'image/png' });
    expect(r.status).toBe(415);
  });
});
