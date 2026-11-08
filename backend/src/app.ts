import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { router } from './http/routes/index.js';
import { errorHandler } from './http/middlewares/errorHandler.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);

  // Uploads são exibidos pelo frontend em outra origem (porta 3000)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static('uploads'));
  app.use('/api', router);
  app.use(errorHandler);

  return app;
}
