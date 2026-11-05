import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env.js';
import { EXTENSOES_INLINE } from './config/multer.js';
import { router } from './http/routes/index.js';
import { errorHandler } from './http/middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  // Uploads são exibidos pelo frontend em outra origem (porta 3000)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/uploads',
    express.static('uploads', {
      setHeaders: (res, arquivo) => {
        // Só mídia e PDF abrem no navegador; o resto (inclusive uploads antigos com .html/.svg) vira download
        if (!EXTENSOES_INLINE.has(path.extname(arquivo).toLowerCase())) res.setHeader('Content-Disposition', 'attachment');
      },
    }),
  );
  app.use('/api', router);
  app.use(errorHandler);

  return app;
}
