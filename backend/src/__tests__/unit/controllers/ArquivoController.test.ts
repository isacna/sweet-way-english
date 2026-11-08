import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  arquivo: { findUnique: vi.fn() },
  matricula: { findFirst: vi.fn() },
  usuario: { findUnique: vi.fn() },
}));
vi.mock('../../../database/client.js', () => ({ prisma: prismaMock }));

import { contentDisposition, getArquivo } from '../../../http/controllers/ArquivoController.js';
import { mockReq } from '../../helpers/mockReqRes.js';
import type { AuthRequest } from '../../../types/index.js';

const ID = '0b6c3f2a-1111-4222-8333-444455556666';
const PROF = 1; // dona da turma 7
const OUTRA_PROF = 2;
const ANA = 10; // aluna da turma 7, autora da entrega
const BIA = 11; // aluna da turma 7
const CAIO = 12; // aluno de outra turma
const ADMIN = 99;

const turma = { id: 7, professorId: PROF };
const base = { id: ID, caminho: 'x.pdf', mime: 'application/pdf', nomeOriginal: 'Lição 1.pdf', atividade: null, material: null, submissao: null };
const entrega = { ...base, donoId: ANA, submissao: { alunoId: ANA, atividade: { turma } } };
const material = { ...base, donoId: PROF, material: { turma } };
const anexoAtividade = { ...base, donoId: PROF, atividade: { turma } };
const solto = { ...base, donoId: ANA }; // ainda não ligado a nada

function res() {
  const r: any = {
    headers: {} as Record<string, string>,
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn((k: string, v: string) => { r.headers[k.toLowerCase()] = v; }),
    removeHeader: vi.fn(),
    sendFile: vi.fn(),
  };
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  return r;
}

function usuario(id: number, role: 'aluno' | 'professor'): AuthRequest['user'] {
  return { id, email: `${id}@t.com`, role };
}

async function pedir(arquivo: object | null, quem: AuthRequest['user']) {
  prismaMock.arquivo.findUnique.mockResolvedValue(arquivo);
  const r = res();
  await getArquivo(mockReq({ params: { id: ID }, user: quem }), r);
  return r;
}

const permitido = (r: any) =>
  expect(r.sendFile).toHaveBeenCalledWith('x.pdf', expect.objectContaining({ root: expect.any(String), dotfiles: 'deny' }), expect.any(Function));
const escondido = (r: any) => {
  expect(r.sendFile).not.toHaveBeenCalled();
  expect(r.status).toHaveBeenCalledWith(404);
};

describe('ArquivoController.getArquivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // matrícula só de ANA e BIA na turma 7; admin só o ADMIN
    prismaMock.matricula.findFirst.mockImplementation(async ({ where }: any) =>
      where.turmaId === 7 && [ANA, BIA].includes(where.alunoId) ? { id: 1 } : null,
    );
    prismaMock.usuario.findUnique.mockImplementation(async ({ where }: any) => ({ admin: where.id === ADMIN }));
  });

  describe('entrega de aluno', () => {
    it('o próprio aluno vê', async () => permitido(await pedir(entrega, usuario(ANA, 'aluno'))));
    it('a professora da turma vê', async () => permitido(await pedir(entrega, usuario(PROF, 'professor'))));
    it('colega da mesma turma não vê (404)', async () => escondido(await pedir(entrega, usuario(BIA, 'aluno'))));
    it('outra professora não vê (404)', async () => escondido(await pedir(entrega, usuario(OUTRA_PROF, 'professor'))));
    it('admin vê (conferido no banco)', async () => permitido(await pedir(entrega, usuario(ADMIN, 'professor'))));
    it('claim admin no token sem admin no banco não basta', async () =>
      escondido(await pedir(entrega, { ...usuario(OUTRA_PROF, 'professor'), admin: true })));
  });

  describe('material e anexo de atividade', () => {
    for (const [nome, arquivo] of [['material', material], ['anexo de atividade', anexoAtividade]] as const) {
      it(`${nome}: aluno matriculado vê`, async () => permitido(await pedir(arquivo, usuario(BIA, 'aluno'))));
      it(`${nome}: aluno de outra turma não vê (404)`, async () => escondido(await pedir(arquivo, usuario(CAIO, 'aluno'))));
      it(`${nome}: a professora dona vê`, async () => permitido(await pedir(arquivo, usuario(PROF, 'professor'))));
      it(`${nome}: outra professora não vê (404)`, async () => escondido(await pedir(arquivo, usuario(OUTRA_PROF, 'professor'))));
    }
  });

  it('arquivo ainda não ligado a nada: só o dono', async () => {
    permitido(await pedir(solto, usuario(ANA, 'aluno')));
    escondido(await pedir(solto, usuario(PROF, 'professor')));
  });

  it('inexistente ou id que não é UUID: 404 sem consultar o arquivo', async () => {
    escondido(await pedir(null, usuario(ANA, 'aluno')));
    prismaMock.arquivo.findUnique.mockClear();
    const r = res();
    await getArquivo(mockReq({ params: { id: '../../etc/passwd' }, user: usuario(ADMIN, 'professor') }), r);
    escondido(r);
    expect(prismaMock.arquivo.findUnique).not.toHaveBeenCalled();
  });

  it('caminho inválido no banco: 404 em vez de sair da pasta', async () => {
    escondido(await pedir({ ...entrega, caminho: '../segredo' }, usuario(ANA, 'aluno')));
  });

  it('cabeçalhos: tipo do banco, inline com nome UTF-8, nosniff e cache privado', async () => {
    const r = await pedir(entrega, usuario(ANA, 'aluno'));
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toBe(`inline; filename="Licao 1.pdf"; filename*=UTF-8''Li%C3%A7%C3%A3o%201.pdf`);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['cache-control']).toMatch(/^private/);
  });

  it('tipos que o navegador não mostra vão como attachment; texto com charset', async () => {
    const doc = await pedir({ ...entrega, mime: 'application/msword', nomeOriginal: 'a.doc' }, usuario(ANA, 'aluno'));
    expect(doc.headers['content-disposition']).toMatch(/^attachment;/);
    const txt = await pedir({ ...entrega, mime: 'text/plain', nomeOriginal: 'a.txt' }, usuario(ANA, 'aluno'));
    expect(txt.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(txt.headers['content-disposition']).toMatch(/^attachment;/);
  });

  it('arquivo sumiu do disco: responde 404', async () => {
    const r = await pedir(entrega, usuario(ANA, 'aluno'));
    const callback = r.sendFile.mock.calls[0][2];
    callback(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it('contentDisposition escapa aspas e caracteres especiais', () => {
    expect(contentDisposition('attachment', 'a"b\'(c).pdf')).toBe(`attachment; filename="a_b'(c).pdf"; filename*=UTF-8''a%22b%27%28c%29.pdf`);
  });
});
