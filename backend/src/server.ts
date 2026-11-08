import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { avisarConfigEmail } from './email/index.js';

// Última linha de defesa: registra o erro em vez de morrer em silêncio. As rotas já passam pelo asyncHandler;
// se algo escapar mesmo assim, o processo segue (rejeição) ou sai para o Docker reiniciar (exceção síncrona).
process.on('unhandledRejection', (motivo) => {
  logger.error({ err: motivo }, 'Promessa rejeitada sem tratamento');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Exceção não tratada, encerrando');
  process.exit(1);
});

if (!env.DATABASE_URL) logger.warn('DATABASE_URL não definida; as consultas ao banco vão falhar.');
avisarConfigEmail();

createApp().listen(env.PORT, '0.0.0.0', () => {
  logger.info({ porta: env.PORT, ambiente: env.NODE_ENV }, `Servidor ouvindo em http://localhost:${env.PORT}`);
});
