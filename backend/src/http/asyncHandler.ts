import type { Request, RequestHandler, Response } from 'express';

/**
 * Envolve um controller async: promessa rejeitada vai para o errorHandler (o Express 4 não faz isso sozinho,
 * e uma rejeição solta derruba o processo). O tipo de `req` é o do controller (ex.: AuthRequest, garantido
 * pelo authenticateToken que vem antes na rota).
 */
export function h<R extends Request = Request>(fn: (req: R, res: Response) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req as R, res))
      .catch(next);
  };
}
