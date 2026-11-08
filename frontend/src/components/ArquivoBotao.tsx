"use client";

import { useState, type ReactNode } from "react";
import { abrirArquivo, ehArquivoPrivado } from "@/lib/arquivos";

type ArquivoBotaoProps = {
  /** `arquivoUrl`/`urlArquivo` da API: "/api/arquivos/<id>" (privado) ou um link externo. */
  url: string;
  /** Nome para o download (`arquivo.nomeOriginal`). */
  nome?: string;
  /** Baixa em vez de abrir numa nova aba. */
  baixar?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

/**
 * Abre ou baixa um arquivo. Privado: busca com a sessão (apiFetch) e abre a object URL;
 * link externo: <a target="_blank"> comum.
 */
export function ArquivoBotao({ url, nome, baixar, className = "", children, ...rest }: ArquivoBotaoProps) {
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState("");

  if (!ehArquivoPrivado(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className} aria-label={rest["aria-label"]}>
        {children}
      </a>
    );
  }

  async function abrir() {
    setErro("");
    setAbrindo(true);
    try {
      await abrirArquivo(url, { nome, baixar });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível abrir o arquivo.");
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={abrir}
        disabled={abrindo}
        aria-busy={abrindo}
        aria-label={rest["aria-label"]}
        className={`${className} disabled:opacity-60 disabled:cursor-wait`}
      >
        {children}
      </button>
      {erro && (
        <span role="alert" className="text-xs text-danger-ink">
          {erro}
        </span>
      )}
    </span>
  );
}
