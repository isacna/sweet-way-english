// Simulação por padrão. --aplicar inclui apenas os novos exercícios e recursos.
// Execute a migração do enum sequence antes de aplicar. Não publica nem remove dados.
import { prisma } from '../src/database/client.js';
import type { Prisma } from '../src/database/generated/prisma/client.js';
import { lerModulos } from '../src/domain/conteudo/arquivos.js';
import { dadosExercicio } from '../src/domain/conteudo/importar.js';
import { MODULOS_PILOTO, planejarPiloto } from '../src/domain/conteudo/pilotos.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--aplicar')) throw new Error('Uso: tsx scripts/atualizar-pilotos.ts [--aplicar]');
  const aplicar = args.includes('--aplicar');
  const arquivos = lerModulos().filter((a) => a.modulo && MODULOS_PILOTO.includes(a.modulo.slug));
  if (arquivos.length !== MODULOS_PILOTO.length || arquivos.some((a) => a.erros.length)) throw new Error('Valide os três módulos-piloto antes de atualizar.');
  console.log(aplicar ? 'Aplicando atualização aditiva.' : 'SIMULAÇÃO: nenhuma alteração será salva.');
  await prisma.$transaction(async (tx) => {
    for (const { modulo } of arquivos) {
      for (const fonte of modulo!.licoes) {
        const atual = await tx.licao.findUnique({ where: { slug: fonte.slug }, include: { exercicios: true } });
        if (!atual) { console.log(`${fonte.slug}: ausente; importe o conteúdo inicial antes de atualizar.`); continue; }
        const plano = planejarPiloto(fonte, atual.exercicios, atual.apresentacao);
        console.log(`${fonte.slug}: ${plano.novos.length} exercícios novos; preservando ${atual.exercicios.length} existentes e status ${atual.status}.`);
        if (!aplicar) continue;
        for (const [i, e] of plano.novos.entries()) await tx.exercicio.create({ data: { ...dadosExercicio(e, plano.ordemInicial + i), licaoId: atual.id } });
        await tx.licao.update({ where: { id: atual.id }, data: {
          apresentacao: plano.apresentacao as Prisma.InputJsonObject,
          minutosEstimados: Math.max(atual.minutosEstimados, fonte.minutosEstimados),
        } });
      }
    }
  }, { isolationLevel: 'Serializable', timeout: 30000 });
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
