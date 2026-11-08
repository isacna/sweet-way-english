// Integração com Postgres real (npm run test:db). Sem TEST_DATABASE_URL, tudo é pulado.
// globalSetup.ts já recriou o schema e aplicou as migrações.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const temBanco = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!temBanco)('Postgres real', () => {
  // Imports dinâmicos: sem banco configurado, nem o client é carregado
  let prisma: typeof import('../../database/client.js').prisma;
  let app: ReturnType<typeof import('../../app.js').createApp>;

  beforeAll(async () => {
    ({ prisma } = await import('../../database/client.js'));
    const { createApp } = await import('../../app.js');
    const { importarConteudo } = await import('../../domain/conteudo/importar.js');
    app = createApp();
    await importarConteudo(prisma, { publicar: true });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  describe('auth com e-mail sem diferenciar maiúsculas', () => {
    const corpo = { nome: 'Ana Real', email: ' Ana.Real@Teste.COM ', senha: 'senha123', dataNascimento: '1995-04-10' };
    let token = '';

    it('cadastro grava o e-mail em minúsculo', async () => {
      const r = await request(app).post('/api/auth/register/aluno').send(corpo);
      expect(r.status).toBe(201);
      const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'ana.real@teste.com' } });
      expect(u.atualizadoEm).toBeInstanceOf(Date);
    });

    it('recusa o mesmo e-mail com outra caixa (índice único)', async () => {
      const r = await request(app).post('/api/auth/register/aluno').send({ ...corpo, email: 'ANA.REAL@teste.com' });
      expect(r.status).toBe(400);
    });

    it('login com outra combinação de maiúsculas encontra a conta', async () => {
      const r = await request(app).post('/api/auth/login').send({ email: 'ANA.real@TESTE.com', senha: 'senha123' });
      expect(r.status).toBe(200);
      expect(r.body.user.email).toBe('ana.real@teste.com');
      token = r.body.token;
    });

    it('carrega a trilha do curso (conteúdo publicado)', async () => {
      const r = await request(app).get('/api/curso').set('Authorization', `Bearer ${token}`);
      expect(r.status).toBe(200);
      expect(r.body.perfil.metodologia).toBe('gramatica');
      const modulos = r.body.niveis[0].modulos;
      expect(modulos).toHaveLength(10);
      expect(modulos[0].desbloqueado).toBe(true);
      expect(modulos[0].licoes[0].desbloqueada).toBe(true);
      expect(modulos[1].desbloqueado).toBe(false);
    });

    it('cria, atualiza e apaga a nota de uma lição (upsert)', async () => {
      const licao = await prisma.licao.findUniqueOrThrow({ where: { slug: 'a1-m01-l1' } });
      const url = `/api/curso/licoes/${licao.id}/nota`;
      const auth = { Authorization: `Bearer ${token}` };

      expect((await request(app).put(url).set(auth).send({ texto: 'primeira' })).status).toBe(200);
      const r2 = await request(app).put(url).set(auth).send({ texto: 'segunda' });
      expect(r2.body.nota.texto).toBe('segunda');
      expect(await prisma.notaLicao.count({ where: { licaoId: licao.id } })).toBe(1);

      await request(app).put(url).set(auth).send({ texto: '   ' });
      expect(await prisma.notaLicao.count({ where: { licaoId: licao.id } })).toBe(0);
    });

    it('primeiro acesso com várias requisições ao mesmo tempo cria um só perfil, sem erro', async () => {
      const novo = { nome: 'Corrida', email: 'corrida@teste.com', senha: 'senha123', dataNascimento: '1990-01-01' };
      expect((await request(app).post('/api/auth/register/aluno').send(novo)).status).toBe(201);
      const login = await request(app).post('/api/auth/login').send({ email: novo.email, senha: novo.senha });
      const auth = { Authorization: `Bearer ${login.body.token}` };

      const respostas = await Promise.all(Array.from({ length: 6 }, () => request(app).get('/api/curso').set(auth)));
      expect(respostas.map((r) => r.status)).toEqual(Array(6).fill(200));
      expect(await prisma.perfilAprendiz.count({ where: { usuarioId: login.body.user.id } })).toBe(1);
    });
  });

  describe('enums', () => {
    it('o conteúdo importado usa os enums com os mesmos valores do JSON', async () => {
      const etapas = await prisma.exercicio.groupBy({ by: ['etapa'], _count: true });
      expect(etapas.map((e) => e.etapa).sort()).toEqual(['controlada', 'producao', 'quiz', 'semicontrolada']);
      const habilidades = await prisma.itemTeste.groupBy({ by: ['habilidade'], _count: true });
      expect(habilidades.map((h) => h.habilidade).sort()).toEqual(['escrita', 'gramatica_vocabulario', 'leitura']);
    });

    it('o banco recusa valor fora do enum', async () => {
      await expect(
        prisma.$executeRawUnsafe(`UPDATE "MaterialApoio" SET tipo = 'planilha' WHERE id = -1`),
      ).rejects.toThrow();
    });
  });

  describe('onDelete', () => {
    async function montarTurma() {
      const sufixo = Math.random().toString(36).slice(2, 8);
      const prof = await prisma.usuario.create({
        data: { nome: 'Prof', email: `prof-${sufixo}@t.com`, senha: 'x', papel: 'professor' },
      });
      const aluno = await prisma.usuario.create({
        data: { nome: 'Aluno', email: `aluno-${sufixo}@t.com`, senha: 'x', papel: 'aluno' },
      });
      const turma = await prisma.turma.create({
        data: { nome: 'T', codigoConvite: sufixo.toUpperCase(), professorId: prof.id },
      });
      await prisma.matricula.create({ data: { alunoId: aluno.id, turmaId: turma.id } });
      await prisma.aviso.create({ data: { titulo: 'Oi', turmaId: turma.id } });
      await prisma.materialApoio.create({ data: { titulo: 'M', tipo: 'link', url: 'https://x', turmaId: turma.id } });
      const atividade = await prisma.atividade.create({
        data: { titulo: 'A', descricao: 'd', dataEntrega: new Date(), turmaId: turma.id },
      });
      const sub = await prisma.submissao.create({ data: { atividadeId: atividade.id, alunoId: aluno.id } });
      await prisma.feedback.create({ data: { submissaoId: sub.id, professorId: prof.id, comentario: 'ok', nota: 9 } });
      return { prof, aluno, turma };
    }

    it('apagar a turma apaga matrículas, avisos, materiais, atividades, entregas e feedbacks', async () => {
      const { prof, aluno, turma } = await montarTurma();
      await prisma.turma.delete({ where: { id: turma.id } });

      expect(await prisma.matricula.count({ where: { turmaId: turma.id } })).toBe(0);
      expect(await prisma.aviso.count({ where: { turmaId: turma.id } })).toBe(0);
      expect(await prisma.materialApoio.count({ where: { turmaId: turma.id } })).toBe(0);
      expect(await prisma.atividade.count({ where: { turmaId: turma.id } })).toBe(0);
      expect(await prisma.submissao.count({ where: { alunoId: aluno.id } })).toBe(0);
      expect(await prisma.feedback.count({ where: { professorId: prof.id } })).toBe(0);
      // as pessoas continuam
      expect(await prisma.usuario.count({ where: { id: { in: [prof.id, aluno.id] } } })).toBe(2);
    });

    it('não deixa apagar uma professora que ainda tem turmas (Restrict)', async () => {
      const { prof } = await montarTurma();
      await expect(prisma.usuario.delete({ where: { id: prof.id } })).rejects.toThrow();
    });

    it('apagar o revisor deixa revisadoPorId nulo na lição (SetNull)', async () => {
      const { prof } = await montarTurma();
      const licao = await prisma.licao.findUniqueOrThrow({ where: { slug: 'a1-m02-l1' } });
      await prisma.licao.update({ where: { id: licao.id }, data: { revisadoPorId: prof.id } });
      await prisma.turma.deleteMany({ where: { professorId: prof.id } });
      await prisma.feedback.deleteMany({ where: { professorId: prof.id } });
      await prisma.usuario.delete({ where: { id: prof.id } });
      expect((await prisma.licao.findUniqueOrThrow({ where: { id: licao.id } })).revisadoPorId).toBeNull();
    });
  });

  // Por último: usa --forcar, que esvazia o banco de teste
  describe('migrar-sqlite-para-postgres', () => {
    let arquivo = '';

    beforeAll(async () => {
      // Monta um SQLite "antigo" aplicando as migrações arquivadas, como era o dev.db
      arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sweetway-sqlite-')), 'antigo.db');
      const db = new Database(arquivo);
      const pasta = path.resolve('prisma/migrations-sqlite-arquivo');
      for (const m of fs.readdirSync(pasta).filter((d) => /^\d+_/.test(d)).sort()) {
        db.exec(fs.readFileSync(path.join(pasta, m, 'migration.sql'), 'utf8'));
      }
      const senha = await bcrypt.hash('senha123', 4);
      db.exec(`
        INSERT INTO "Usuario" (id, nome, email, senha, papel, admin, criadoEm)
          VALUES (1, 'Prof', 'Prof@Escola.com', '${senha}', 'professor', 1, '2026-03-20 03:08:02'),
                 (7, 'Maria', 'Maria@Example.COM', '${senha}', 'aluno', 0, '2026-03-21T10:00:00.000+00:00');
        INSERT INTO "Turma" (id, nome, codigoConvite, professorId) VALUES (3, 'Turma A', 'ABC123', 1);
        INSERT INTO "Matricula" (id, alunoId, turmaId, status) VALUES (5, 7, 3, 'ativa');
        INSERT INTO "MaterialApoio" (id, titulo, tipo, urlArquivo, turmaId) VALUES (2, 'Livro', 'pdf', '/uploads/x.pdf', 3);
        INSERT INTO "Nivel" (id, codigo, nome, ordem) VALUES (1, 'A1', 'Iniciante', 1);
        INSERT INTO "Modulo" (id, nivelId, ordem, slug, titulo, tema, descricao, canDos, gramatica, vocabulario, funcao, status, atualizadoEm)
          VALUES (1, 1, 1, 'a1-m01', 'M1', 't', 'd', '["a","b"]', 'g', 'v', 'f', 'publicado', 1762300000000);
        INSERT INTO "Licao" (id, moduloId, ordem, slug, titulo, objetivo, minutosEstimados, apresentacao, status, revisadoPorId, atualizadoEm)
          VALUES (1, 1, 1, 'a1-m01-l1', 'L1', 'o', 10, '{"blocos":[]}', 'publicado', 999, '2026-11-04T01:22:39.130+00:00');
        INSERT INTO "Exercicio" (id, licaoId, ordem, etapa, tipo, enunciado, conteudo, gabarito, explicacao, tagsErro)
          VALUES (40, 1, 1, 'quiz', 'word_order', 'e', '{"palavras":["a"]}', '{"ordem":[0]}', 'x', NULL);
        INSERT INTO "PerfilAprendiz" (id, usuarioId, metodologia, xp) VALUES (1, 7, 'gramatica', 30);
        INSERT INTO "RevisaoItem" (id, usuarioId, exercicioId, proximaEm) VALUES (9, 7, 40, '2026-11-05T01:26:54.327+00:00');
      `);
      db.close();
    });

    it('recusa destino com usuários sem --forcar', async () => {
      const { migrarSqliteParaPostgres } = await import('../../../scripts/migrar-sqlite/migrar.js');
      await expect(migrarSqliteParaPostgres(arquivo, prisma)).rejects.toThrow(/--forcar/);
    });

    it('copia tudo preservando ids, normaliza e-mails e ajusta as sequências', async () => {
      const { migrarSqliteParaPostgres } = await import('../../../scripts/migrar-sqlite/migrar.js');
      const r = await migrarSqliteParaPostgres(arquivo, prisma, { forcar: true });
      const porTabela = Object.fromEntries(r.map((t) => [t.tabela, t.destino]));
      expect(porTabela).toMatchObject({ Usuario: 2, Turma: 1, Matricula: 1, Licao: 1, Exercicio: 1, RevisaoItem: 1, NotaLicao: 0, Arquivo: 1 });

      // o material "/uploads/x.pdf" virou um Arquivo da professora da turma
      const material = await prisma.materialApoio.findUniqueOrThrow({ where: { id: 2 }, include: { arquivo: true } });
      expect(material.url).toBeNull();
      expect(material.arquivo).toMatchObject({ donoId: 1, caminho: 'x.pdf', nomeOriginal: 'x.pdf', mime: 'application/pdf' });

      const maria = await prisma.usuario.findUniqueOrThrow({ where: { id: 7 } });
      expect(maria.email).toBe('maria@example.com');
      expect(maria.criadoEm.toISOString()).toBe('2026-03-21T10:00:00.000Z');
      const prof = await prisma.usuario.findUniqueOrThrow({ where: { id: 1 } });
      expect(prof.admin).toBe(true);
      expect(prof.criadoEm.toISOString()).toBe('2026-03-20T03:08:02.000Z');

      const modulo = await prisma.modulo.findUniqueOrThrow({ where: { id: 1 } });
      expect(modulo.canDos).toEqual(['a', 'b']);
      expect(modulo.atualizadoEm.getTime()).toBe(1762300000000);
      const licao = await prisma.licao.findUniqueOrThrow({ where: { id: 1 } });
      expect(licao.revisadoPorId).toBeNull(); // revisor 999 não existia
      const ex = await prisma.exercicio.findUniqueOrThrow({ where: { id: 40 } });
      expect(ex.tipo).toBe('word_order');
      expect(ex.tagsErro).toBeNull();

      // sequência continua depois do maior id copiado
      const novo = await prisma.usuario.create({ data: { nome: 'N', email: 'novo@t.com', senha: 'x', papel: 'aluno' } });
      expect(novo.id).toBe(8);

      // a conta migrada entra com o e-mail em qualquer caixa
      const login = await request(app).post('/api/auth/login').send({ email: 'MARIA@example.com', senha: 'senha123' });
      expect(login.status).toBe(200);
    });
  });
});
