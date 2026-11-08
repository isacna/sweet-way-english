// Uma linha de log por requisição: id, método, caminho (sem query string), status e duração.
// Sem corpo, sem cabeçalhos (cookies e Authorization nunca aparecem), sem IP e sem dados do usuário.
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { logger as loggerPadrao } from '../../config/logger.js';

/** Aceita o X-Request-Id de quem chama (proxy, frontend) se for curto e só com caracteres seguros. */
const ID_VALIDO = /^[A-Za-z0-9._:-]{1,128}$/;

export function idDaRequisicao(req: IncomingMessage, res: ServerResponse) {
  const recebido = req.headers['x-request-id'];
  const id = typeof recebido === 'string' && ID_VALIDO.test(recebido) ? recebido : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

/** Caminho sem a query string (que pode carregar dados). */
function caminho(url: string | undefined) {
  return (url ?? '').split('?')[0];
}

/** Não registra o health check bem-sucedido (o monitoramento chama a cada poucos segundos). */
const ignorar = (req: IncomingMessage) => caminho(req.url) === '/api/health';

export function logRequisicoes(log: Logger = loggerPadrao) {
  return pinoHttp({
    logger: log,
    genReqId: idDaRequisicao,
    // req.log (usado pelo errorHandler) leva só o reqId, não a requisição inteira
    quietReqLogger: true,
    autoLogging: { ignore: ignorar },
    customAttributeKeys: { responseTime: 'duracaoMs' },
    customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    customSuccessMessage: (req, res) => `${req.method} ${caminho((req as { originalUrl?: string }).originalUrl ?? req.url)} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${caminho((req as { originalUrl?: string }).originalUrl ?? req.url)} ${res.statusCode}`,
    serializers: {
      // O id já vai em `reqId` (quietReqLogger)
      req: (req: { method?: string; url?: string }) => ({ method: req.method, path: caminho(req.url) }),
      res: (res: { statusCode?: number }) => ({ status: res.statusCode }),
    },
  });
}
