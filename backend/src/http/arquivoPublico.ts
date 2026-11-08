// Como os arquivos aparecem nas respostas da API (contrato com o frontend).
//  - Entrega e atividade: `arquivoUrl` = "/api/arquivos/<id>" (ou null) + `arquivo` = { id, nomeOriginal, mime, tamanho }.
//  - Material: `urlArquivo` = "/api/arquivos/<id>" para upload ou a URL externa para link (mesmo campo de antes),
//    + `url` (só links) + `arquivo`.
// A URL é relativa ao backend e exige login: o frontend busca com apiFetch (lib/arquivos.ts), nunca em <img src>.

export const arquivoResumoSelect = { id: true, nomeOriginal: true, mime: true, tamanho: true } as const;

export interface ArquivoResumo {
  id: string;
  nomeOriginal: string;
  mime: string;
  tamanho: number;
}

export function urlDoArquivo(id: string) {
  return `/api/arquivos/${id}`;
}

type ComArquivoId = { arquivoId: string | null; arquivo?: ArquivoResumo | null };

/** Entrega/atividade: acrescenta `arquivoUrl` e garante `arquivo` (null sem anexo). */
export function comArquivo<T extends ComArquivoId>(registro: T) {
  return {
    ...registro,
    arquivo: registro.arquivo ?? null,
    arquivoUrl: registro.arquivoId ? urlDoArquivo(registro.arquivoId) : null,
  };
}

/** Material: `urlArquivo` aponta para a rota privada (upload) ou para o link externo. */
export function materialPublico<T extends ComArquivoId & { url: string | null }>(material: T) {
  return {
    ...material,
    arquivo: material.arquivo ?? null,
    urlArquivo: material.arquivoId ? urlDoArquivo(material.arquivoId) : (material.url ?? ''),
  };
}
