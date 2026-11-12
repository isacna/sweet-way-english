// Envia os lembretes de estudo por e-mail do dia (só para quem ligou os lembretes).
// Uso: npm run lembretes:enviar [-- --simular]
//  --simular  lista quem receberia o quê, sem enviar e sem gravar nada
// Feito para o cron (uma vez por dia, no fim da tarde): rodar de novo no mesmo dia não manda em dobro.
// Sai com código 1 se algum envio falhar ou se faltar o provedor de e-mail em produção.
import { prisma } from '../src/database/client.js';
import { logger } from '../src/config/logger.js';
import { enviarLembretes } from '../src/services/lembretes.js';

/** Na simulação o e-mail aparece só em parte: a saída pode ir parar em um log. */
function mascarar(email: string) {
  const [usuario, dominio] = email.split('@');
  return `${usuario.slice(0, 2)}***@${dominio ?? ''}`;
}

const simular = process.argv.slice(2).includes('--simular');

enviarLembretes({ simular })
  .then((r) => {
    if (simular) {
      for (const p of r.lista) {
        const dias = 'dias' in p.lembrete ? ` (${p.lembrete.dias} dias)` : '';
        console.log(`  usuário ${p.usuarioId} ${mascarar(p.email)}: ${p.lembrete.tipo}${dias}`);
      }
      console.log(`Simulação: ${r.enviados} lembrete(s) seriam enviados, de ${r.candidatos} perfil(is) analisado(s). Nada foi enviado.`);
      return;
    }
    logger.info(
      { candidatos: r.candidatos, enviados: r.enviados, falhas: r.falhas, semProvedor: r.semProvedor },
      `Lembretes de estudo: ${r.enviados} enviado(s), ${r.falhas} falha(s)`,
    );
    if (r.falhas > 0 || r.semProvedor) process.exitCode = 1;
  })
  .catch((err) => {
    logger.error({ err }, 'Falha ao enviar os lembretes de estudo');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
