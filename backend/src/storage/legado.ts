// Regras para os valores antigos "/uploads/<arquivo>" (antes do modelo Arquivo). Usadas pelo script que copia um
// SQLite antigo para o Postgres; a migração 20261109010000_arquivos faz o mesmo em SQL. Sem dependência de env.

const PREFIXO = '/uploads/';

/** Nome do arquivo dentro da pasta de uploads, ou null se o valor não for um upload local seguro. */
export function caminhoLegado(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith(PREFIXO)) return null;
  const nome = url.slice(PREFIXO.length);
  if (!nome || /[/\\]/.test(nome) || nome.includes('..')) return null;
  return nome;
}

/** O multer antigo gravava "<timestamp>-<nome>"; o nome mostrado ao usuário fica sem o prefixo. */
export function nomeOriginalLegado(caminho: string): string {
  return caminho.replace(/^[0-9]+-/, '') || caminho;
}

const MIME_POR_EXTENSAO: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

/** Tipo pela extensão (mesma tabela do CASE da migração). Desconhecido vira application/octet-stream. */
export function mimePorExtensao(nome: string): string {
  const ext = /\.([A-Za-z0-9]+)$/.exec(nome)?.[1]?.toLowerCase() ?? '';
  return MIME_POR_EXTENSAO[ext] ?? 'application/octet-stream';
}
