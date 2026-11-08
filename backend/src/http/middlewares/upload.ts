import type { Request, RequestHandler, Response } from 'express';
import { upload } from '../../config/multer.js';
import { prisma } from '../../database/client.js';
import type { Arquivo, Prisma } from '../../database/generated/prisma/client.js';
import { detectarTipo, gravarNoDisco, nomeOriginalSeguro, removerDoDisco } from '../../storage/arquivos.js';
import type { GravarAnexo } from '../../services/tipos.js';

/** Arquivo recebido e já conferido pelos bytes, ainda só em memória. */
export interface ArquivoRecebido {
  buffer: Buffer;
  nomeOriginal: string;
  mime: string;
  ext: string;
  tamanho: number;
}

interface EstadoUpload {
  arquivo: ArquivoRecebido;
  /** Gravados no disco nesta requisição e ainda sem commit no banco */
  pendentes: Set<string>;
}

const estados = new WeakMap<Request, EstadoUpload>();

/** O arquivo da requisição (depois de `receberArquivo`), ou null se nenhum foi enviado. */
export function arquivoRecebido(req: Request): ArquivoRecebido | null {
  return estados.get(req)?.arquivo ?? null;
}

/**
 * Recebe um arquivo multipart no campo `campo` (opcional: sem arquivo, ou corpo JSON, segue normalmente).
 * Confere o tipo pelos bytes (415 se não for permitido) e deixa o arquivo em memória para o controller.
 *
 * Limpeza: nada vai para o disco antes de `salvarArquivoRecebido`. Se o controller recusar a requisição antes,
 * não há o que apagar. Se gravar e a transação falhar, o arquivo é removido na hora. E, por garantia, ao fim da
 * resposta (qualquer status, inclusive erro lançado ou conexão caída) tudo o que foi gravado e não confirmado
 * no banco é removido.
 */
export function receberArquivo(campo: string, opcoes: { somenteImagem?: boolean } = {}): RequestHandler {
  const single = upload.single(campo);
  return (req, res, next) => {
    single(req, res, (err?: unknown) => {
      if (err) return next(err);
      const file = req.file;
      if (!file) return next();
      detectarTipo(file.buffer, file.mimetype, file.originalname, opcoes).then((tipo) => {
        const estado: EstadoUpload = {
          arquivo: {
            buffer: file.buffer,
            nomeOriginal: nomeOriginalSeguro(file.originalname),
            mime: tipo.mime,
            ext: tipo.ext,
            tamanho: file.size,
          },
          pendentes: new Set(),
        };
        estados.set(req, estado);
        res.on('close', () => limparPendentes(estado));
        next();
      }, next);
    });
  };
}

function limparPendentes(estado: EstadoUpload) {
  if (estado.pendentes.size === 0) return;
  const caminhos = [...estado.pendentes];
  estado.pendentes.clear();
  void removerDoDisco(caminhos);
}

/**
 * Grava o arquivo recebido (nome aleatório) e, numa transação, cria a linha de Arquivo do `donoId` e chama `usar`
 * para ligar o arquivo ao registro (entrega, material, atividade). Se qualquer passo falhar, a transação volta e o
 * arquivo sai do disco. Chame só depois de validar a requisição.
 */
export async function salvarArquivoRecebido<T>(
  req: Request,
  donoId: number,
  usar: (tx: Prisma.TransactionClient, arquivo: Arquivo) => Promise<T>,
): Promise<T> {
  const estado = estados.get(req);
  if (!estado) throw new Error('salvarArquivoRecebido sem arquivo: use receberArquivo() na rota e confira arquivoRecebido(req)');
  const { arquivo } = estado;

  const caminho = await gravarNoDisco(arquivo.buffer, arquivo.ext);
  estado.pendentes.add(caminho);
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const linha = await tx.arquivo.create({
        data: { donoId, nomeOriginal: arquivo.nomeOriginal, caminho, mime: arquivo.mime, tamanho: arquivo.tamanho },
      });
      return usar(tx, linha);
    });
    estado.pendentes.delete(caminho); // confirmado no banco: fica
    return resultado;
  } catch (err) {
    estado.pendentes.delete(caminho);
    await removerDoDisco([caminho]);
    throw err;
  }
}

/**
 * O arquivo da requisição como `GravarAnexo` para um service (ou null se nenhum foi enviado). O service chama a
 * função só depois de validar tudo; ela grava com `salvarArquivoRecebido` em nome de `donoId`.
 */
export function anexoDaRequisicao(req: Request, donoId: number): GravarAnexo | null {
  if (!arquivoRecebido(req)) return null;
  return (usar) => salvarArquivoRecebido(req, donoId, usar);
}

/** Para testes: injeta um arquivo recebido sem passar pelo multer. */
export function definirArquivoRecebido(req: Request, arquivo: ArquivoRecebido, res?: Response) {
  const estado: EstadoUpload = { arquivo, pendentes: new Set() };
  estados.set(req, estado);
  res?.on?.('close', () => limparPendentes(estado));
}
