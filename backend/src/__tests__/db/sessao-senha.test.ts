// Sessão em cookie, versaoToken e recuperação de senha contra um Postgres real (npm run test:db).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// O e-mail não sai de verdade: guardamos as mensagens para ler o link
const enviados = vi.hoisted(() => [] as { para: string; texto: string }[]);
vi.mock('../../email/index.js', () => ({
  enviarEmail: async (msg: { para: string; texto: string }) => {
    enviados.push(msg);
  },
}));

const temBanco = !!process.env.TEST_DATABASE_URL;

function tokenDoLink(texto: string) {
  return /redefinir-senha\?token=([0-9a-f]{64})/.exec(texto)![1];
}

function cookieSessao(res: request.Response) {
  const linhas = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return linhas.find((l) => l.startsWith('sw_sessao='))?.split(';')[0] ?? '';
}

describe.skipIf(!temBanco)('Postgres real: sessão e senha', () => {
  let prisma: typeof import('../../database/client.js').prisma;
  let app: ReturnType<typeof import('../../app.js').createApp>;
  let usuarioId = 0;
  const email = 'reset.real@teste.com';

  beforeAll(async () => {
    ({ prisma } = await import('../../database/client.js'));
    const { createApp } = await import('../../app.js');
    app = createApp();
    const u = await prisma.usuario.create({
      data: { nome: 'Rita Reset', email, senha: await bcrypt.hash('antiga123', 10), papel: 'aluno' },
    });
    usuarioId = u.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  let cookie = '';
  let bearer = '';

  it('login grava o cookie de sessão e o cookie sozinho autentica', async () => {
    const r = await request(app).post('/api/auth/login').send({ email, senha: 'antiga123' });
    expect(r.status).toBe(200);
    cookie = cookieSessao(r);
    bearer = r.body.token;
    expect(cookie).toMatch(/^sw_sessao=.+/);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: usuarioId, email, role: 'aluno', admin: false });
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bearer}`)).status).toBe(200);
  });

  it('esqueci-senha responde igual para conta inexistente e não grava token', async () => {
    const r = await request(app).post('/api/auth/esqueci-senha').send({ email: 'ninguem@teste.com' });
    expect(r.status).toBe(200);
    expect(await prisma.tokenSenha.count()).toBe(0);
    expect(enviados).toHaveLength(0);
  });

  let token = '';

  it('esqueci-senha grava só o hash e o pedido novo invalida o anterior', async () => {
    const r1 = await request(app).post('/api/auth/esqueci-senha').send({ email: 'Reset.Real@TESTE.com' });
    const r2 = await request(app).post('/api/auth/esqueci-senha').send({ email });
    expect(r1.body).toEqual(r2.body);
    expect(enviados).toHaveLength(2);
    const primeiro = tokenDoLink(enviados[0].texto);
    token = tokenDoLink(enviados[1].texto);

    const tokens = await prisma.tokenSenha.findMany({ where: { usuarioId } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].hashToken).not.toBe(token);
    expect(tokens[0].hashToken).toMatch(/^[0-9a-f]{64}$/);

    const antigo = await request(app).post('/api/auth/redefinir-senha').send({ token: primeiro, senha: 'nova12345' });
    expect(antigo.status).toBe(400);
  });

  it('redefinir-senha troca a senha, marca o token e derruba as sessões abertas', async () => {
    const r = await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'nova12345' });
    expect(r.status).toBe(200);

    const u = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(u.versaoToken).toBe(1);
    expect(await bcrypt.compare('nova12345', u.senha)).toBe(true);
    const t = await prisma.tokenSenha.findFirstOrThrow({ where: { usuarioId } });
    expect(t.usadoEm).toBeInstanceOf(Date);

    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bearer}`)).status).toBe(401);
  });

  it('o mesmo link não funciona duas vezes', async () => {
    const r = await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'outra12345' });
    expect(r.status).toBe(400);
  });

  it('link expirado é recusado', async () => {
    await request(app).post('/api/auth/esqueci-senha').send({ email });
    const novo = tokenDoLink(enviados.at(-1)!.texto);
    await prisma.tokenSenha.updateMany({ where: { usuarioId, usadoEm: null }, data: { expiraEm: new Date(Date.now() - 1000) } });
    const r = await request(app).post('/api/auth/redefinir-senha').send({ token: novo, senha: 'outra12345' });
    expect(r.status).toBe(400);
  });

  it('login com a senha nova funciona e a antiga não', async () => {
    expect((await request(app).post('/api/auth/login').send({ email, senha: 'antiga123' })).status).toBe(401);
    const r = await request(app).post('/api/auth/login').send({ email, senha: 'nova12345' });
    expect(r.status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieSessao(r))).status).toBe(200);
  });

  it('usuário apagado perde a sessão e os tokens de senha (cascade)', async () => {
    const r = await request(app).post('/api/auth/login').send({ email, senha: 'nova12345' });
    const c = cookieSessao(r);
    await prisma.usuario.delete({ where: { id: usuarioId } });
    expect(await prisma.tokenSenha.count({ where: { usuarioId } })).toBe(0);
    expect((await request(app).get('/api/auth/me').set('Cookie', c)).status).toBe(401);
  });
});
