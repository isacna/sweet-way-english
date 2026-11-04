import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { env } from './env.js';

export class TipoArquivoNaoPermitido extends Error {}

const MIMES_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

function mimePermitido(mime: string) {
  return (
    MIMES_PERMITIDOS.has(mime) ||
    (mime.startsWith('image/') && mime !== 'image/svg+xml') ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/')
  );
}

/** Mantém o nome legível, mas sem caracteres que possam virar caminho ou HTML. */
function nomeSeguro(original: string) {
  const ext = path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = path
    .basename(original, path.extname(original))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .slice(0, 80);
  return `${base || 'arquivo'}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${nomeSeguro(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (mimePermitido(file.mimetype)) cb(null, true);
    else cb(new TipoArquivoNaoPermitido(`Tipo de arquivo não permitido: ${file.mimetype}`));
  },
});
