"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Arquivos privados (entregas, materiais, anexos de atividade). A API devolve `arquivoUrl` /
 * `urlArquivo` = "/api/arquivos/<id>" + `arquivo` = { id, nomeOriginal, mime, tamanho }.
 * A rota exige a sessão, então o arquivo é baixado com `apiFetch` (manda o cookie) e exibido
 * por uma object URL (`blob:`), nunca colocando a URL da API direto em <img>/<iframe>.
 * Links externos de material (YouTube, sites) continuam como URLs normais.
 */

export type ArquivoResumo = {
  id: string;
  nomeOriginal: string;
  mime: string;
  tamanho: number;
};

const PREFIXO = "/api/arquivos/";

export function ehArquivoPrivado(url: string | null | undefined): url is string {
  return !!url && url.startsWith(PREFIXO);
}

/** "/api/arquivos/<id>" a partir do id (para quem só tem o `arquivo`). */
export function urlArquivo(id: string) {
  return `${PREFIXO}${id}`;
}

export class ErroArquivo extends Error {}

/** Baixa o arquivo privado com a sessão do usuário. 404 = não existe ou sem permissão. */
export async function buscarArquivo(url: string): Promise<Blob> {
  if (!ehArquivoPrivado(url)) throw new ErroArquivo("URL de arquivo inválida");
  const res = await apiFetch(url.slice("/api".length));
  if (!res.ok) {
    throw new ErroArquivo(
      res.status === 404 ? "Arquivo não encontrado ou sem permissão." : "Não foi possível abrir o arquivo.",
    );
  }
  return res.blob();
}

/** Object URLs abertas em outra aba ou baixadas só são liberadas depois de um tempo. */
const LIBERAR_APOS_MS = 60_000;

/**
 * Abre um arquivo privado numa nova aba (ou baixa, com `baixar: true` ou se o navegador bloquear a aba).
 * Chame direto no clique: a aba é aberta antes do download para não cair no bloqueador de pop-up.
 */
export async function abrirArquivo(
  url: string,
  opcoes: { nome?: string; baixar?: boolean } = {},
): Promise<void> {
  const janela = opcoes.baixar ? null : window.open("", "_blank");
  try {
    const blob = await buscarArquivo(url);
    const objeto = URL.createObjectURL(blob);
    if (janela && !janela.closed) {
      janela.location.href = objeto;
    } else {
      const a = document.createElement("a");
      a.href = objeto;
      a.download = opcoes.nome || "arquivo";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(objeto), LIBERAR_APOS_MS);
  } catch (err) {
    janela?.close();
    throw err;
  }
}

/**
 * URL exibível para <img>/<audio>/<video>/<iframe>: para arquivo privado, baixa (quando `ativo`)
 * e devolve uma object URL, liberada ao desmontar ou trocar de arquivo; URL externa volta igual.
 */
export function useArquivoUrl(url: string | null | undefined, ativo = true) {
  const privado = ehArquivoPrivado(url);
  const [estado, setEstado] = useState<{ chave: string | null; src: string | null; erro: string | null }>({
    chave: null,
    src: null,
    erro: null,
  });

  useEffect(() => {
    if (!privado || !ativo || !url) return;
    let cancelado = false;
    let objeto: string | null = null;
    buscarArquivo(url).then(
      (blob) => {
        if (cancelado) return;
        objeto = URL.createObjectURL(blob);
        setEstado({ chave: url, src: objeto, erro: null });
      },
      (err: unknown) => {
        if (cancelado) return;
        setEstado({ chave: url, src: null, erro: err instanceof Error ? err.message : "Erro ao carregar o arquivo." });
      },
    );
    return () => {
      cancelado = true;
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [url, privado, ativo]);

  if (!url) return { src: null, carregando: false, erro: null };
  if (!privado) return { src: url, carregando: false, erro: null };
  if (!ativo) return { src: null, carregando: false, erro: null };
  const atual = estado.chave === url;
  return {
    src: atual ? estado.src : null,
    carregando: !atual,
    erro: atual ? estado.erro : null,
  };
}

export function formatarTamanho(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
