// Armazenamento dos uploads privados (F2 de docs/plano-producao.md, seção 2).
//  - O tipo vem dos bytes do arquivo (file-type), nunca do navegador; a lista de tipos é a mesma de antes.
//  - O nome no disco é aleatório (UUID + extensão do tipo detectado); o nome enviado só vai para o banco.
//  - Os arquivos ficam em env.UPLOAD_DIR e só saem por GET /api/arquivos/:id (ArquivoController).
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { env } from '../config/env.js';
import type { Prisma } from '../database/generated/prisma/client.js';

export class TipoArquivoNaoPermitido extends Error {}

export interface TipoDetectado {
  mime: string;
  ext: string;
}

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const DOC = 'application/msword';
const PPT = 'application/vnd.ms-powerpoint';

/** Tipos que o navegador mostra sem baixar: vão com `Content-Disposition: inline`. */
export function tipoPrevisualizavel(mime: string): boolean {
  return (
    mime === 'application/pdf' ||
    mime.startsWith('image/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/')
  );
}

/** Mesma regra do multer antigo, aplicada ao tipo DETECTADO: PDF, Office, texto, imagens (sem SVG), áudio, vídeo. */
function mimeDetectadoPermitido(mime: string): boolean {
  return (
    mime === 'application/pdf' ||
    mime === DOCX ||
    mime === PPTX ||
    (mime.startsWith('image/') && mime !== 'image/svg+xml') ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/')
  );
}

const IMAGENS_LOGO = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function extensao(nome: string) {
  return path.extname(nome).slice(1).toLowerCase();
}

/** Texto puro não tem assinatura: aceita só sem bytes nulos e em UTF-8 válido. */
function pareceTexto(buffer: Buffer) {
  if (buffer.subarray(0, 8192).includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Descobre o tipo real pelos bytes. Lança TipoArquivoNaoPermitido (415) se não estiver na lista.
 * `mimeDeclarado`/`nomeOriginal` só desempatam o que os bytes não distinguem: .doc/.ppt (mesmo contêiner CFB)
 * e texto puro (sem assinatura).
 */
export async function detectarTipo(
  buffer: Buffer,
  mimeDeclarado: string,
  nomeOriginal: string,
  opcoes: { somenteImagem?: boolean } = {},
): Promise<TipoDetectado> {
  const detectado = await fileTypeFromBuffer(buffer);
  const ext = extensao(nomeOriginal);

  if (opcoes.somenteImagem) {
    if (detectado && IMAGENS_LOGO.has(detectado.mime)) return { mime: detectado.mime, ext: detectado.ext };
    throw new TipoArquivoNaoPermitido('Envie uma imagem PNG, JPEG, GIF ou WebP.');
  }

  if (detectado) {
    if (mimeDetectadoPermitido(detectado.mime)) return { mime: detectado.mime, ext: detectado.ext };
    if (detectado.mime === 'application/x-cfb') {
      if (mimeDeclarado === DOC || ext === 'doc') return { mime: DOC, ext: 'doc' };
      if (mimeDeclarado === PPT || ext === 'ppt') return { mime: PPT, ext: 'ppt' };
    }
    throw new TipoArquivoNaoPermitido(`Tipo de arquivo não permitido: ${detectado.mime}`);
  }

  if ((mimeDeclarado === 'text/plain' || ext === 'txt') && pareceTexto(buffer)) {
    return { mime: 'text/plain', ext: 'txt' };
  }
  throw new TipoArquivoNaoPermitido('Tipo de arquivo não permitido ou não reconhecido.');
}

/** Pasta dos uploads (absoluta). */
export function pastaUploads() {
  return path.resolve(env.UPLOAD_DIR);
}

/**
 * Caminho absoluto de um arquivo da pasta de uploads. `caminho` é sempre um nome simples gerado pelo servidor
 * (ou migrado de "/uploads/<nome>"); qualquer coisa com separador ou ".." é recusada.
 */
export function caminhoAbsoluto(caminho: string) {
  if (!caminho || caminho !== path.basename(caminho) || caminho.includes('..') || /[/\\]/.test(caminho)) {
    throw new Error(`Caminho de arquivo inválido: ${caminho}`);
  }
  return path.join(pastaUploads(), caminho);
}

/** Grava com nome aleatório e devolve o `caminho` (relativo à pasta de uploads). */
export async function gravarNoDisco(buffer: Buffer, ext: string): Promise<string> {
  const caminho = `${randomUUID()}.${ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'}`;
  await fs.mkdir(pastaUploads(), { recursive: true });
  await fs.writeFile(caminhoAbsoluto(caminho), buffer, { flag: 'wx' });
  return caminho;
}

/** Remove do disco; arquivo que já não existe não é erro. Nunca lança (só registra). */
export async function removerDoDisco(caminhos: Iterable<string>) {
  for (const caminho of caminhos) {
    try {
      await fs.unlink(caminhoAbsoluto(caminho));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Falha ao remover upload', caminho, err);
    }
  }
}

/** Nome mostrado ao usuário e usado no download: sem pasta, sem caracteres de controle, até 200 caracteres. */
export function nomeOriginalSeguro(nome: string) {
  const base = path.basename(String(nome ?? '').replace(/\\/g, '/'));
  // eslint-disable-next-line no-control-regex
  const limpo = base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200);
  return limpo || 'arquivo';
}

/**
 * Apaga as linhas de Arquivo (que já não podem estar ligadas a nenhum registro: FK Restrict) e devolve os
 * caminhos que podem sair do disco. Um caminho ainda usado por outra linha fica (dados migrados de antes do
 * modelo Arquivo podiam apontar vários registros para o mesmo arquivo). Chame `removerDoDisco` só DEPOIS do
 * commit da transação.
 */
export async function apagarArquivos(tx: Prisma.TransactionClient, ids: Iterable<string | null | undefined>) {
  const lista = [...new Set([...ids].filter((id): id is string => !!id))];
  if (lista.length === 0) return [];
  const linhas = await tx.arquivo.findMany({ where: { id: { in: lista } }, select: { caminho: true } });
  await tx.arquivo.deleteMany({ where: { id: { in: lista } } });
  const caminhos = [...new Set(linhas.map((l) => l.caminho))];
  if (caminhos.length === 0) return [];
  const aindaUsados = await tx.arquivo.findMany({ where: { caminho: { in: caminhos } }, select: { caminho: true } });
  const usados = new Set(aindaUsados.map((l) => l.caminho));
  return caminhos.filter((c) => !usados.has(c));
}

/**
 * Arquivos de uma ou mais turmas (anexos de atividades, entregas e materiais). Para quem vai apagar a turma:
 * apague os registros, depois `apagarArquivos` com estes ids.
 */
export async function idsArquivosDasTurmas(tx: Prisma.TransactionClient, turmaIds: number[]) {
  if (turmaIds.length === 0) return [];
  const [atividades, submissoes, materiais] = await Promise.all([
    tx.atividade.findMany({ where: { turmaId: { in: turmaIds }, arquivoId: { not: null } }, select: { arquivoId: true } }),
    tx.submissao.findMany({
      where: { atividade: { turmaId: { in: turmaIds } }, arquivoId: { not: null } },
      select: { arquivoId: true },
    }),
    tx.materialApoio.findMany({ where: { turmaId: { in: turmaIds }, arquivoId: { not: null } }, select: { arquivoId: true } }),
  ]);
  return [...atividades, ...submissoes, ...materiais].map((r) => r.arquivoId as string);
}
