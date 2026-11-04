// Valida os arquivos de conteúdo do curso sem tocar no banco.
// Uso: npm run conteudo:validar            (todos)
//      npm run conteudo:validar -- m03     (só prisma/conteudo/*/m03.json)
import path from 'path';
import { lerModulos } from '../src/domain/conteudo/arquivos.js';

const somente = process.argv.slice(2);
const arquivos = lerModulos(undefined, somente.length ? somente : undefined);
let falhas = 0;

for (const a of arquivos) {
  const nome = path.relative(process.cwd(), a.arquivo);
  if (a.erros.length) {
    falhas++;
    console.log(`✗ ${nome}`);
    for (const e of a.erros) console.log(`    ${e}`);
    continue;
  }
  const m = a.modulo!;
  const exercicios = m.licoes.reduce((s, l) => s + l.exercicios.length, 0);
  const formas = new Set(m.teste.itens.map((i) => i.forma)).size;
  console.log(`✓ ${nome} — ${m.licoes.length} lições, ${exercicios} exercícios, teste: ${m.teste.itens.length} itens em ${formas} formas`);
}

if (!arquivos.length) console.log('Nenhum arquivo encontrado.');
process.exit(falhas || !arquivos.length ? 1 : 0);
