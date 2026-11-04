import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import { TipoArquivoNaoPermitido } from '../../config/multer.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `Arquivo maior que ${env.UPLOAD_MAX_MB} MB` });
      return;
    }
    res.status(400).json({ error: 'Upload inválido' });
    return;
  }
  if (err instanceof TipoArquivoNaoPermitido) {
    res.status(415).json({ error: err.message });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'JSON inválido' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
