// Importa prisma/conteudo para o banco.
// Uso: npm run conteudo:importar [-- --publicar] [-- --sobrescrever]
//  --publicar      importa como "publicado" (sem passar pela revisão da professora)
//  --sobrescrever  substitui lições e testes existentes (apaga edições da professora)
import { prisma } from '../src/database/client.js';
import { importarConteudo } from '../src/domain/conteudo/importar.js';

const args = new Set(process.argv.slice(2));
importarConteudo(prisma, { publicar: args.has('--publicar'), sobrescrever: args.has('--sobrescrever') })
  .then((r) => console.log('Conteúdo importado:', r))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
