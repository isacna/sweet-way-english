// Prepara o Postgres de TEST_DATABASE_URL: apaga o schema e aplica as migrações (prisma migrate deploy).
import { execSync } from 'node:child_process';
import pg from 'pg';

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.log('[test:db] TEST_DATABASE_URL não definida: testes com Postgres pulados.');
    return;
  }
  const nome = new URL(url).pathname.slice(1);
  if (!/test/i.test(nome)) {
    throw new Error(`[test:db] O banco "${nome}" será apagado; por segurança o nome precisa conter "test".`);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
