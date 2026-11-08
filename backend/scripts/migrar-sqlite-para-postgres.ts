// Leva os dados de um banco SQLite antigo para o Postgres (F1 de docs/plano-producao.md).
//
// Uso:
//   DATABASE_URL=postgresql://... npm run db:migrar-sqlite -- caminho/para/dev.db [--forcar]
//   (ou SQLITE_PATH=caminho/para/dev.db npm run db:migrar-sqlite)
//
// - O SQLite é aberto só para leitura.
// - O Postgres precisa estar migrado (`npx prisma migrate deploy`) e vazio; com usuários, recusa,
//   a menos que receba --forcar (que APAGA todas as tabelas do destino antes de copiar).
// - Ids são preservados e as sequências ajustadas; e-mails viram minúsculos; tudo numa transação só.
import 'dotenv/config';
import path from 'node:path';
import { criarPrisma } from '../src/database/client.js';
import { migrarSqliteParaPostgres } from './migrar-sqlite/migrar.js';

const args = process.argv.slice(2);
const forcar = args.includes('--forcar');
const caminho = args.find((a) => !a.startsWith('--')) ?? process.env.SQLITE_PATH;
const url = process.env.DATABASE_URL;

if (!caminho) {
  console.error('Informe o arquivo SQLite: npm run db:migrar-sqlite -- caminho/para/dev.db (ou SQLITE_PATH).');
  process.exit(1);
}
if (!url?.startsWith('postgres')) {
  console.error('DATABASE_URL precisa apontar para o Postgres de destino (postgresql://...).');
  process.exit(1);
}

const prisma = criarPrisma(url);
const destino = new URL(url);
console.log(`Origem:  ${path.resolve(caminho)} (somente leitura)`);
console.log(`Destino: ${destino.host}${destino.pathname}${forcar ? ' (--forcar: o destino será esvaziado)' : ''}`);

migrarSqliteParaPostgres(caminho, prisma, { forcar, log: (m) => console.log('  ' + m) })
  .then((r) => {
    console.table(r.map((t) => ({ tabela: t.tabela, sqlite: t.origem ?? '(não existe)', postgres: t.destino })));
    console.log('Migração concluída.');
  })
  .catch((e) => {
    console.error('Falhou, nada foi gravado no destino:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
