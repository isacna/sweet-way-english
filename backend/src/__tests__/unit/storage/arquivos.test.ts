import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { env } from '../../../config/env.js';
import {
  apagarArquivos,
  caminhoAbsoluto,
  detectarTipo,
  gravarNoDisco,
  nomeOriginalSeguro,
  removerDoDisco,
  tipoPrevisualizavel,
  TipoArquivoNaoPermitido,
} from '../../../storage/arquivos.js';
import { caminhoLegado, mimePorExtensao, nomeOriginalLegado } from '../../../storage/legado.js';
import { FIXTURES } from '../../helpers/fixturesArquivos.js';


describe('detectarTipo (bytes, não o que o navegador diz)', () => {
  it('aceita um PDF de verdade', async () => {
    expect(await detectarTipo(FIXTURES.pdf, 'application/pdf', 'tarefa.pdf')).toEqual({ mime: 'application/pdf', ext: 'pdf' });
  });

  it('aceita um PNG mesmo com tipo/extensão errados e usa a extensão real', async () => {
    expect(await detectarTipo(FIXTURES.png, 'application/octet-stream', 'foto.jpg')).toEqual({ mime: 'image/png', ext: 'png' });
  });

  it('recusa um .exe renomeado para .pdf', async () => {
    await expect(detectarTipo(FIXTURES.exe, 'application/pdf', 'tarefa.pdf')).rejects.toBeInstanceOf(TipoArquivoNaoPermitido);
  });

  it('recusa SVG, mesmo renomeado para .png ou declarado como imagem', async () => {
    await expect(detectarTipo(FIXTURES.svg, 'image/png', 'logo.png')).rejects.toBeInstanceOf(TipoArquivoNaoPermitido);
    await expect(detectarTipo(FIXTURES.svgSemXml, 'image/svg+xml', 'logo.svg')).rejects.toBeInstanceOf(TipoArquivoNaoPermitido);
  });

  it('texto puro só quando declarado como texto e sem bytes binários', async () => {
    expect(await detectarTipo(FIXTURES.texto, 'text/plain', 'notas.txt')).toEqual({ mime: 'text/plain', ext: 'txt' });
    await expect(detectarTipo(FIXTURES.texto, 'application/pdf', 'notas.pdf')).rejects.toBeInstanceOf(TipoArquivoNaoPermitido);
    const binario = Buffer.concat([Buffer.from('abc'), Buffer.from([0, 1, 2])]);
    await expect(detectarTipo(binario, 'text/plain', 'x.txt')).rejects.toBeInstanceOf(TipoArquivoNaoPermitido);
  });

  it('Word/PowerPoint antigos (CFB): decide pelo tipo/extensão declarados; sem eles, recusa', async () => {
    expect(await detectarTipo(FIXTURES.cfb, 'application/msword', 'a.doc')).toEqual({ mime: 'application/msword', ext: 'doc' });
    expect(await detectarTipo(FIXTURES.cfb, 'application/octet-stream', 'a.ppt')).toEqual({
      mime: 'application/vnd.ms-powerpoint',
      ext: 'ppt',
    });
    await expect(detectarTipo(FIXTURES.cfb, 'application/octet-stream', 'a.msi')).rejects.toBeInstanceOf(TipoArquivoNaoPermitido);
  });

  it('logo: só imagens raster', async () => {
    expect(await detectarTipo(FIXTURES.png, 'image/png', 'logo.png', { somenteImagem: true })).toEqual({ mime: 'image/png', ext: 'png' });
    await expect(detectarTipo(FIXTURES.pdf, 'image/png', 'logo.png', { somenteImagem: true })).rejects.toBeInstanceOf(
      TipoArquivoNaoPermitido,
    );
  });

  it('tipos previsualizáveis vão inline; o resto, download', () => {
    expect(tipoPrevisualizavel('application/pdf')).toBe(true);
    expect(tipoPrevisualizavel('video/mp4')).toBe(true);
    expect(tipoPrevisualizavel('text/plain')).toBe(false);
    expect(tipoPrevisualizavel('application/msword')).toBe(false);
  });
});

describe('disco', () => {
  let pasta = '';
  let original = '';

  beforeAll(() => {
    pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-storage-'));
    original = env.UPLOAD_DIR;
    (env as { UPLOAD_DIR: string }).UPLOAD_DIR = pasta;
  });
  afterAll(() => {
    (env as { UPLOAD_DIR: string }).UPLOAD_DIR = original;
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('grava com nome aleatório (UUID + extensão detectada) e remove', async () => {
    const a = await gravarNoDisco(FIXTURES.pdf, 'pdf');
    const b = await gravarNoDisco(FIXTURES.pdf, 'pdf');
    expect(a).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(a).not.toBe(b);
    expect(fs.readFileSync(path.join(pasta, a))).toEqual(FIXTURES.pdf);

    await removerDoDisco([a, b, 'nao-existe.pdf']); // arquivo ausente não é erro
    expect(fs.existsSync(path.join(pasta, a))).toBe(false);
  });

  it('caminhoAbsoluto recusa qualquer coisa fora da pasta', () => {
    expect(caminhoAbsoluto('abc.pdf')).toBe(path.join(pasta, 'abc.pdf'));
    for (const ruim of ['../x.pdf', '..\\x.pdf', 'a/b.pdf', '', '..']) {
      expect(() => caminhoAbsoluto(ruim)).toThrow();
    }
  });
});

describe('apagarArquivos', () => {
  const tx = () => ({
    arquivo: { findMany: vi.fn(), deleteMany: vi.fn() },
  });

  it('apaga as linhas e devolve só os caminhos que ninguém mais usa', async () => {
    const t = tx();
    t.arquivo.findMany
      .mockResolvedValueOnce([{ caminho: 'a.pdf' }, { caminho: 'compartilhado.pdf' }])
      .mockResolvedValueOnce([{ caminho: 'compartilhado.pdf' }]);
    const r = await apagarArquivos(t as never, ['1', '2', null, '1']);
    expect(t.arquivo.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['1', '2'] } } });
    expect(r).toEqual(['a.pdf']);
  });

  it('sem ids não consulta o banco', async () => {
    const t = tx();
    expect(await apagarArquivos(t as never, [null, undefined])).toEqual([]);
    expect(t.arquivo.findMany).not.toHaveBeenCalled();
  });
});

describe('nomes', () => {
  it('nomeOriginalSeguro tira pasta e caracteres de controle e mantém acentos', () => {
    expect(nomeOriginalSeguro('C:\\fakepath\\Lição 1.pdf')).toBe('Lição 1.pdf');
    expect(nomeOriginalSeguro('../../etc/passwd')).toBe('passwd');
    expect(nomeOriginalSeguro('a\u0000b\nc.txt')).toBe('abc.txt');
    expect(nomeOriginalSeguro('')).toBe('arquivo');
  });

  it('legado: "/uploads/<nome>" vira caminho; nome original sem o timestamp; tipo pela extensão', () => {
    expect(caminhoLegado('/uploads/1773977192408-Worksheet.pdf')).toBe('1773977192408-Worksheet.pdf');
    expect(caminhoLegado('/uploads/../segredo')).toBeNull();
    expect(caminhoLegado('/uploads/a/b.pdf')).toBeNull();
    expect(caminhoLegado('https://exemplo.com/a.pdf')).toBeNull();
    expect(nomeOriginalLegado('1773977192408-Worksheet.pdf')).toBe('Worksheet.pdf');
    expect(mimePorExtensao('x.MP3')).toBe('audio/mpeg');
    expect(mimePorExtensao('x.exe')).toBe('application/octet-stream');
  });
});
