import type { Arquivo, Prisma } from '../database/generated/prisma/client.js';
import type { Papel } from '../types/index.js';

/** Quem está pedindo (o `req.user` do authenticateToken). */
export interface UsuarioSessao {
  id: number;
  role: Papel;
  admin?: boolean;
}

/**
 * Grava o arquivo enviado na requisição e o liga a um registro numa transação (ver `salvarArquivoRecebido`).
 * O controller cria esta função a partir da requisição (`anexoDaRequisicao`); o service só decide quando chamá-la,
 * depois de validar tudo, e não conhece a requisição HTTP.
 */
export type GravarAnexo = <T>(usar: (tx: Prisma.TransactionClient, arquivo: Arquivo) => Promise<T>) => Promise<T>;
