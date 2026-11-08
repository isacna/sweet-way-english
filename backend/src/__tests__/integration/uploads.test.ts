// Uploads privados no app real (createApp): nada da pasta de uploads sai sem passar pela API.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const prismaMock = vi.hoisted(() => ({
  configuracaoApp: { findUnique: vi.fn(), upsert: vi.fn() },
  arquivo: { findUnique: vi.fn() },
}));
vi.mock('../../database/client.js', () => ({ prisma: prismaMock }));

import { env } from '../../config/env.js';
import { createApp } from '../../app.js';
import { FIXTURES } from '../helpers/fixturesArquivos.js';

describe('Integração — uploads privados', () => {
  let pasta = '';
  let original = '';
  const app = createApp();

  beforeAll(() => {
    original = env.UPLOAD_DIR;
    // Pasta sob um diretório com ponto (como .claude/worktrees): o envio não pode tratar isso como dotfile
    pasta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-int-uploads-')), '.oculta', 'uploads');
    fs.mkdirSync(pasta, { recursive: true });
    (env as { UPLOAD_DIR: string }).UPLOAD_DIR = pasta;
    fs.writeFileSync(path.join(pasta, '1773977192408-entrega.pdf'), FIXTURES.pdf);
    fs.writeFileSync(path.join(pasta, 'logo-abc.png'), FIXTURES.png);
  });
  afterAll(() => {
    (env as { UPLOAD_DIR: string }).UPLOAD_DIR = original;
    fs.rmSync(path.dirname(path.dirname(pasta)), { recursive: true, force: true });
  });
  beforeEach(() => vi.clearAllMocks());

  it('/uploads/<arquivo> não é mais servido (nem pelo caminho antigo)', async () => {
    expect((await request(app).get('/uploads/1773977192408-entrega.pdf')).status).toBe(404);
    expect((await request(app).get('/api/uploads/1773977192408-entrega.pdf')).status).toBe(404);
  });

  it('GET /api/arquivos/:id exige login', async () => {
    const r = await request(app).get('/api/arquivos/0b6c3f2a-1111-4222-8333-444455556666');
    expect(r.status).toBe(401);
    expect(prismaMock.arquivo.findUnique).not.toHaveBeenCalled();
  });

  it('a logo continua pública em /api/configuracoes/logo, com nosniff', async () => {
    prismaMock.configuracaoApp.findUnique.mockResolvedValue({ id: 1, logoCaminho: 'logo-abc.png', atualizadoEm: new Date() });
    const r = await request(app).get('/api/configuracoes/logo');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toBe('image/png');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(r.body)).toEqual(FIXTURES.png);
  });

  it('sem logo: 404; GET /api/configuracoes devolve a URL versionada da rota pública', async () => {
    prismaMock.configuracaoApp.findUnique.mockResolvedValue({ id: 1, logoCaminho: null });
    expect((await request(app).get('/api/configuracoes/logo')).status).toBe(404);

    prismaMock.configuracaoApp.upsert.mockResolvedValue({ id: 1, logoCaminho: 'logo-abc.png', atualizadoEm: new Date(1700000000000) });
    const r = await request(app).get('/api/configuracoes');
    expect(r.body.logoUrl).toBe(`${env.APP_URL}/api/configuracoes/logo?v=1700000000000`);
  });
});
