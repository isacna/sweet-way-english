// Logs estruturados (pino). JSON em produção/teste, legível (pino-pretty) em desenvolvimento.
// Regra: nada de corpo de requisição, cookies, cabeçalho Authorization nem dados pessoais nos logs.
import { createRequire } from 'node:module';
import { pino, type DestinationStream, type Logger, type LoggerOptions } from 'pino';
import { env } from './env.js';

/** Caminhos apagados de qualquer objeto logado (segunda barreira: os serializers já não incluem nada disso). */
export const CAMPOS_OCULTOS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
  '*.senha',
  '*.token',
  '*.password',
];

/** Testes ficam em silêncio; nos demais ambientes vale LOG_LEVEL (padrão info). */
export function nivelPadrao() {
  return env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL;
}

/** pino-pretty só em desenvolvimento e só se estiver instalado (é devDependency; a imagem de produção não tem). */
function transportePretty(): LoggerOptions['transport'] {
  if (env.NODE_ENV !== 'development') return undefined;
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
  } catch {
    return undefined;
  }
  return { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } };
}

/** Cria um logger. `destino` é para testes (captura a saída); sem ele, escreve no stdout. */
export function criarLogger(destino?: DestinationStream, nivel: string = nivelPadrao()): Logger {
  const opcoes: LoggerOptions = {
    level: nivel,
    redact: { paths: CAMPOS_OCULTOS, censor: '[oculto]' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  if (destino) return pino(opcoes, destino);
  const transport = transportePretty();
  return pino(transport ? { ...opcoes, transport } : opcoes);
}

export const logger = criarLogger();
