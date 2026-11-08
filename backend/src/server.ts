import { createApp } from './app.js';
import { env } from './config/env.js';
import { avisarConfigEmail } from './email/index.js';

// Última linha de defesa: registra o erro em vez de morrer em silêncio. As rotas já passam pelo asyncHandler;
// se algo escapar mesmo assim, o processo segue (rejeição) ou sai para o Docker reiniciar (exceção síncrona).
process.on('unhandledRejection', (motivo) => {
  console.error('Promessa rejeitada sem tratamento:', motivo);
});
process.on('uncaughtException', (err) => {
  console.error('Exceção não tratada, encerrando:', err);
  process.exit(1);
});

avisarConfigEmail();

createApp().listen(env.PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
