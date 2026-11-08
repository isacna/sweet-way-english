import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { router } from './http/routes/index.js';
import { errorHandler } from './http/middlewares/errorHandler.js';
import { logRequisicoes } from './http/middlewares/log.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);

  // Primeiro: dá um id a cada requisição (X-Request-Id) e registra método, caminho, status e duração
  app.use(logRequisicoes());

  // Uploads são exibidos pelo frontend em outra origem (porta 3000)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // credentials: o navegador manda o cookie de sessão nas chamadas do frontend (só para as origens da lista)
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', router);
  app.use(errorHandler);

  return app;
}
