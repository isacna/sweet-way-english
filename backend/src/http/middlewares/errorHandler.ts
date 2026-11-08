import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { Logger } from 'pino';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { ErroServico } from '../../services/erros.js';
import { TipoArquivoNaoPermitido } from '../../storage/arquivos.js';

/**
 * Erros que chegam aqui (lançados pelos controllers/services ou passados com next):
 *  - ErroServico (ErroValidacao 400, ErroProibido 403, ErroNaoEncontrado 404, ErroConflito 409) → `{ error }`;
 *  - upload grande demais 413, upload inválido 400, tipo de arquivo não permitido 415, JSON malformado 400;
 *  - o resto é 500, registrado com a stack (e o id da requisição) e sem detalhes para o cliente.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ErroServico) {
    res.status(err.status).json({ error: err.message });
    return;
  }
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

  const log = (req as Request & { log?: Logger }).log ?? logger;
  log.error({ err }, 'Erro não tratado');
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erro interno do servidor' });
}
