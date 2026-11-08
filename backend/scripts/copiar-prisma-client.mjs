// Parte do `npm run build`: o tsc não copia o client gerado pelo Prisma (JS + .wasm em src/database/generated),
// então ele vai para dist/database/generated, onde o código compilado o importa.
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origem = path.join(raiz, 'src', 'database', 'generated');
const destino = path.join(raiz, 'dist', 'database', 'generated');

if (!existsSync(origem)) {
  console.error('src/database/generated não existe: rode `npx prisma generate` antes do build.');
  process.exit(1);
}
rmSync(destino, { recursive: true, force: true });
cpSync(origem, destino, { recursive: true });
console.log('Prisma client copiado para dist/database/generated');
