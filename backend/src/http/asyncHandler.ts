import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthRequest } from '../types/index.js';

/**
 * O Express 4 não captura promessas rejeitadas: sem isto, um erro do Prisma num
 * controller async vira `unhandledRejection` e derruba o processo.
 * Controllers recebem AuthRequest (garantido por authenticateToken).
 */
export const h =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req as AuthRequest, res).catch(next);
  };
