import multer from 'multer';
import { env } from './env.js';
import { TipoArquivoNaoPermitido } from '../storage/arquivos.js';

export { TipoArquivoNaoPermitido };

/**
 * Multer em memória: o arquivo (até UPLOAD_MAX_MB, um por requisição) fica num Buffer e só vai para o disco quando
 * o controller já validou tudo e chama `salvarArquivoRecebido` (middlewares/upload.ts). Assim uma requisição
 * recusada (400/403/404/415/erro) não deixa nada no disco, e a checagem do tipo pelos bytes lê o próprio Buffer.
 * Use sempre `receberArquivo(campo)` nas rotas, não este objeto direto.
 *
 * O filtro abaixo é só uma triagem barata pelo tipo declarado (recusa antes de ler o corpo inteiro);
 * a decisão de verdade é `detectarTipo` (storage/arquivos.ts).
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  // Nomes com acento (o padrão do busboy é latin1 e estragaria "ç", "ã"…)
  defParamCharset: 'utf8',
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/svg+xml' || file.mimetype === 'text/html') {
      cb(new TipoArquivoNaoPermitido(`Tipo de arquivo não permitido: ${file.mimetype}`));
    } else cb(null, true);
  },
});
