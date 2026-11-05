import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from './env.js';

export class TipoArquivoNaoPermitido extends Error {}

/**
 * MIME permitido → extensão gravada. A extensão vem do tipo, nunca do nome enviado:
 * senão `x.html` declarado como image/png seria servido como HTML pelo /uploads.
 */
const EXTENSAO_POR_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.weba',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
};

/** Extensões que o navegador pode abrir inline; o resto do /uploads sai como download. */
export const EXTENSOES_INLINE = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp',
  '.mp3', '.m4a', '.aac', '.wav', '.ogg', '.weba', '.mp4', '.webm', '.ogv', '.mov',
]);

/** Mantém o nome legível, mas sem caracteres que possam virar caminho ou HTML. */
function nomeSeguro(original: string, mime: string) {
  const base = path
    .basename(original, path.extname(original))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .slice(0, 80);
  return `${base || 'arquivo'}${EXTENSAO_POR_MIME[mime]}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Parte aleatória: o /uploads é público, então o nome não pode ser adivinhável
    cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}-${nomeSeguro(file.originalname, file.mimetype)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1, fields: 20, fieldSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (Object.hasOwn(EXTENSAO_POR_MIME, file.mimetype)) cb(null, true);
    else cb(new TipoArquivoNaoPermitido(`Tipo de arquivo não permitido: ${file.mimetype}`));
  },
});

/**
 * O multer grava o arquivo antes do controller checar permissão. Se a resposta for
 * erro (403, 400, 500…), o arquivo é apagado, para não acumular lixo nem hospedar
 * arquivos de quem não podia enviar.
 */
function descartarSeFalhar(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (file && res.statusCode >= 400) fs.unlink(file.path, () => {});
  });
  next();
}

/** Upload de um arquivo no campo `campo`, apagado se a requisição falhar. */
export function uploadUnico(campo: string): RequestHandler[] {
  return [descartarSeFalhar, upload.single(campo)];
}
