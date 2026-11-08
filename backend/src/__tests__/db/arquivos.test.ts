// Uploads privados com Postgres real (npm run test:db). Sem TEST_DATABASE_URL, tudo é pulado.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const url = process.env.TEST_DATABASE_URL;
const temBanco = !!url;

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

describe.skipIf(!temBanco)('migração 20261109010000_arquivos (dados antigos)', () => {
  const schema = `migr_arquivos_${process.pid}`;
  let client: pg.Client;

  const sql = (nome: string) => fs.readFileSync(path.resolve('prisma/migrations', nome, 'migration.sql'), 'utf8');

  beforeAll(async () => {
    client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    // Banco "antigo": todas as migrações anteriores a esta, com as URLs /uploads/... em texto
    const anteriores = fs
      .readdirSync(path.resolve('prisma/migrations'))
      .filter((d) => /^\d+_/.test(d) && d < '20261109010000_arquivos')
      .sort();
    for (const m of anteriores) await client.query(sql(m));
    await client.query(`
      INSERT INTO "Usuario" (id, nome, email, senha, papel, "atualizadoEm") VALUES
        (1, 'Prof', 'prof@t.com', 'x', 'professor', now()),
        (2, 'Ana', 'ana@t.com', 'x', 'aluno', now());
      INSERT INTO "Turma" (id, nome, "codigoConvite", "professorId", "atualizadoEm") VALUES (1, 'T', 'ABC', 1, now());
      INSERT INTO "Atividade" (id, titulo, descricao, "dataEntrega", "turmaId", "atualizadoEm") VALUES (1, 'A', 'd', now(), 1, now());
      INSERT INTO "Submissao" (id, "atividadeId", "alunoId", "arquivoUrl", "dataEnvio", "atualizadoEm") VALUES
        (1, 1, 2, '/uploads/1773977192408-Minha_Tarefa.PDF', '2026-03-01T10:00:00Z', now()),
        (2, 1, 2, NULL, now(), now()),
        (3, 1, 2, '/uploads/../../etc/passwd', now(), now()),
        (4, 1, 2, '/uploads/1773977192408-Minha_Tarefa.PDF', now(), now());
      INSERT INTO "MaterialApoio" (id, titulo, tipo, "urlArquivo", "turmaId") VALUES
        (1, 'Worksheet', 'pdf', '/uploads/1700000000000-audio.mp3', 1),
        (2, 'Site', 'link', 'https://exemplo.com', 1);
      INSERT INTO "ConfiguracaoApp" (id, "logoUrl", "atualizadoEm") VALUES (1, '/uploads/1700-logo.png', now());
    `);
    await client.query(sql('20261109010000_arquivos'));
  });

  afterAll(async () => {
    await client?.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client?.end();
  });

  it('cria um Arquivo por entrega com upload, do aluno, com tipo pela extensão', async () => {
    const { rows } = await client.query(`
      SELECT s.id, s."arquivoId", a."donoId", a."nomeOriginal", a.caminho, a.mime, a.tamanho,
             a."criadoEm" = s."dataEnvio" AS "mesmaData"
      FROM "Submissao" s LEFT JOIN "Arquivo" a ON a.id = s."arquivoId" ORDER BY s.id`);
    expect(rows[0]).toMatchObject({
      donoId: 2,
      nomeOriginal: 'Minha_Tarefa.PDF',
      caminho: '1773977192408-Minha_Tarefa.PDF',
      mime: 'application/pdf',
      tamanho: 0,
    });
    expect(rows[0].arquivoId).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows[0].mesmaData).toBe(true);
    expect(rows[1].arquivoId).toBeNull();
    expect(rows[2].arquivoId).toBeNull(); // caminho com ".." é descartado
    // dois registros com o mesmo arquivo antigo: uma linha de Arquivo para cada (mesmo caminho)
    expect(rows[3].arquivoId).not.toBe(rows[0].arquivoId);
    expect(rows[3].caminho).toBe(rows[0].caminho);
  });

  it('material: upload vira Arquivo da professora, link vai para url', async () => {
    const { rows } = await client.query(`
      SELECT m.id, m.url, m."arquivoId", a."donoId", a.mime FROM "MaterialApoio" m
      LEFT JOIN "Arquivo" a ON a.id = m."arquivoId" ORDER BY m.id`);
    expect(rows[0]).toMatchObject({ url: null, donoId: 1, mime: 'audio/mpeg' });
    expect(rows[1]).toMatchObject({ url: 'https://exemplo.com', arquivoId: null });
  });

  it('logo vira só o nome do arquivo e as colunas antigas saem', async () => {
    const { rows } = await client.query(`SELECT "logoCaminho" FROM "ConfiguracaoApp"`);
    expect(rows[0].logoCaminho).toBe('1700-logo.png');
    const { rows: colunas } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND column_name IN ('arquivoUrl', 'urlArquivo', 'logoUrl')`,
      [schema],
    );
    expect(colunas).toHaveLength(0);
  });

  it('CHECK: material precisa ser link OU upload', async () => {
    await expect(
      client.query(`INSERT INTO "MaterialApoio" (titulo, tipo, "turmaId") VALUES ('vazio', 'link', 1)`),
    ).rejects.toThrow(/MaterialApoio_url_ou_arquivo/);
  });

  it('FK Restrict: não apaga o Arquivo ligado a uma entrega nem o dono com arquivos', async () => {
    await expect(client.query(`DELETE FROM "Arquivo" WHERE "donoId" = 2`)).rejects.toThrow(/foreign key/);
    await client.query(`DELETE FROM "Submissao" WHERE "alunoId" = 2`);
    await expect(client.query(`DELETE FROM "Usuario" WHERE id = 2`)).rejects.toThrow(/foreign key/);
  });
});

describe.skipIf(!temBanco)('uploads privados com Postgres real', () => {
  let prisma: typeof import('../../database/client.js').prisma;
  let app: ReturnType<typeof import('../../app.js').createApp>;
  let pasta = '';
  const token = (id: number, role: 'aluno' | 'professor') =>
    `Bearer ${jwt.sign({ id, email: `${id}@t.com`, role, admin: false, v: 0 }, process.env.JWT_SECRET!, { expiresIn: '1h' })}`;

  let prof = 0;
  let ana = 0;
  let bia = 0;
  let turmaId = 0;
  let atividadeId = 0;

  beforeAll(async () => {
    pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'sweetway-uploads-'));
    process.env.UPLOAD_DIR = pasta;
    const { env } = await import('../../config/env.js');
    (env as { UPLOAD_DIR: string }).UPLOAD_DIR = pasta;
    ({ prisma } = await import('../../database/client.js'));
    const { createApp } = await import('../../app.js');
    app = createApp();

    const sufixo = Math.random().toString(36).slice(2, 8);
    const criar = (nome: string, papel: 'aluno' | 'professor') =>
      prisma.usuario.create({ data: { nome, email: `${nome}-${sufixo}@t.com`, senha: 'x', papel } });
    prof = (await criar('prof', 'professor')).id;
    ana = (await criar('ana', 'aluno')).id;
    bia = (await criar('bia', 'aluno')).id;
    turmaId = (await prisma.turma.create({ data: { nome: 'T', codigoConvite: `A${sufixo}`, professorId: prof } })).id;
    await prisma.matricula.createMany({ data: [{ alunoId: ana, turmaId }, { alunoId: bia, turmaId }] });
    atividadeId = (
      await prisma.atividade.create({ data: { titulo: 'A', descricao: 'd', dataEntrega: new Date(), turmaId } })
    ).id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('entrega com PDF: grava com nome aleatório, liga o Arquivo e só aluno/professora veem', async () => {
    const r = await request(app)
      .post(`/api/atividades/${atividadeId}/submissoes`)
      .set('Authorization', token(ana, 'aluno'))
      .attach('arquivo', PDF, { filename: 'Minha tarefa çã.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(201);
    expect(r.body.arquivoUrl).toBe(`/api/arquivos/${r.body.arquivo.id}`);
    expect(r.body.arquivo).toMatchObject({ nomeOriginal: 'Minha tarefa çã.pdf', mime: 'application/pdf', tamanho: PDF.length });

    const linha = await prisma.arquivo.findUniqueOrThrow({ where: { id: r.body.arquivo.id } });
    expect(linha.caminho).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(fs.existsSync(path.join(pasta, linha.caminho))).toBe(true);

    const dono = await request(app).get(r.body.arquivoUrl).set('Authorization', token(ana, 'aluno'));
    expect(dono.status).toBe(200);
    expect(dono.headers['content-type']).toBe('application/pdf');
    expect(dono.headers['content-disposition']).toContain("filename*=UTF-8''Minha%20tarefa%20%C3%A7%C3%A3.pdf");
    expect(dono.headers['x-content-type-options']).toBe('nosniff');
    expect(dono.headers['cache-control']).toContain('private');

    expect((await request(app).get(r.body.arquivoUrl).set('Authorization', token(prof, 'professor'))).status).toBe(200);
    // colega da mesma turma não vê a entrega
    expect((await request(app).get(r.body.arquivoUrl).set('Authorization', token(bia, 'aluno'))).status).toBe(404);
    expect((await request(app).get(r.body.arquivoUrl)).status).toBe(401);
  });

  it('recusa .exe renomeado para .pdf (415) e não deixa nada no disco', async () => {
    const antes = fs.readdirSync(pasta).length;
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]);
    const r = await request(app)
      .post(`/api/atividades/${atividadeId}/submissoes`)
      .set('Authorization', token(bia, 'aluno'))
      .attach('arquivo', exe, { filename: 'tarefa.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(415);
    expect(fs.readdirSync(pasta).length).toBe(antes);
  });

  it('entrega recusada pelo controller (aluno fora da turma) não grava arquivo', async () => {
    const intruso = await prisma.usuario.create({
      data: { nome: 'x', email: `x-${Date.now()}@t.com`, senha: 'x', papel: 'aluno' },
    });
    const antes = fs.readdirSync(pasta).length;
    const r = await request(app)
      .post(`/api/atividades/${atividadeId}/submissoes`)
      .set('Authorization', token(intruso.id, 'aluno'))
      .attach('arquivo', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(403);
    expect(fs.readdirSync(pasta).length).toBe(antes);
    expect(await prisma.arquivo.count({ where: { donoId: intruso.id } })).toBe(0);
  });

  it('material: matriculados veem; apagar o material apaga Arquivo e arquivo do disco', async () => {
    const r = await request(app)
      .post(`/api/turmas/${turmaId}/materiais`)
      .set('Authorization', token(prof, 'professor'))
      .field('titulo', 'Worksheet')
      .field('tipo', 'pdf')
      .attach('arquivo', PDF, { filename: 'w.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(201);
    expect(r.body.urlArquivo).toBe(`/api/arquivos/${r.body.arquivoId}`);
    expect((await request(app).get(r.body.urlArquivo).set('Authorization', token(bia, 'aluno'))).status).toBe(200);

    const linha = await prisma.arquivo.findUniqueOrThrow({ where: { id: r.body.arquivoId } });
    const del = await request(app)
      .delete(`/api/turmas/${turmaId}/materiais/${r.body.id}`)
      .set('Authorization', token(prof, 'professor'));
    expect(del.status).toBe(204);
    expect(await prisma.arquivo.count({ where: { id: linha.id } })).toBe(0);
    expect(fs.existsSync(path.join(pasta, linha.caminho))).toBe(false);
  });

  it('apagar o aluno apaga as entregas, os Arquivos e os arquivos no disco', async () => {
    const arquivos = await prisma.arquivo.findMany({ where: { donoId: ana } });
    expect(arquivos.length).toBeGreaterThan(0);
    const r = await request(app).delete(`/api/professor/alunos/${ana}`).set('Authorization', token(prof, 'professor'));
    expect(r.status).toBe(204);
    expect(await prisma.arquivo.count({ where: { donoId: ana } })).toBe(0);
    for (const a of arquivos) expect(fs.existsSync(path.join(pasta, a.caminho))).toBe(false);
  });
});
