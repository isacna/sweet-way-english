"use client";

import { useState } from "react";
import {
  getAssetPreviewKind,
  youtubeEmbedUrl,
  type AssetPreviewKind,
} from "@/lib/assetPreviewKind";
import { ehArquivoPrivado, useArquivoUrl, type ArquivoResumo } from "@/lib/arquivos";
import { ArquivoBotao } from "@/components/ArquivoBotao";
import { Download, FileText } from "lucide-react";

type AssetPreviewProps = {
  /**
   * `arquivoUrl`/`urlArquivo` da API: "/api/arquivos/<id>" (arquivo privado, baixado com a sessão)
   * ou um link externo (YouTube, site, imagem pública).
   */
  url: string | null;
  /** Metadados do arquivo privado (`arquivo` na resposta da API): o MIME decide a prévia. */
  arquivo?: ArquivoResumo | null;
  /** Tipo do material (`pdf`, `video`, …) ou omitido para anexos. */
  tipo?: string | null;
  /** Rótulo para leitores de tela / título do iframe. */
  title: string;
  /** Altura máxima da área de preview (iframe PDF, vídeo). */
  frameMaxHeightClass?: string;
  className?: string;
};

function FallbackAbrir({
  url,
  nome,
  title,
  privado,
}: {
  url: string;
  nome?: string;
  title: string;
  privado: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center bg-gray-50 rounded-lg border border-dashed border-line-strong">
      <FileText aria-hidden className="h-[40px] w-[40px] shrink-0" />
      <p className="text-sm text-ink-soft max-w-sm">
        {privado
          ? "Este tipo de arquivo não tem pré-visualização. Baixe para abrir no seu computador."
          : "Não há pré-visualização embutida para este link. Abra em nova aba para ver o conteúdo."}
      </p>
      <ArquivoBotao
        url={url}
        nome={nome}
        baixar={privado}
        className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong"
      >
        <Download aria-hidden className="h-[16px] w-[16px] shrink-0" />
        {privado ? "Baixar arquivo" : "Abrir em nova aba"}
      </ArquivoBotao>
      <span className="sr-only">{title}</span>
    </div>
  );
}

function PreviewBody({
  kind,
  url,
  arquivo,
  title,
  frameMaxHeightClass,
}: {
  kind: AssetPreviewKind;
  url: string;
  arquivo?: ArquivoResumo | null;
  title: string;
  frameMaxHeightClass: string;
}) {
  const privado = ehArquivoPrivado(url);
  // Arquivo privado: baixado com a sessão e exibido por object URL (liberada ao fechar a prévia)
  const precisaBaixar = privado && kind !== "none";
  const { src, carregando, erro } = useArquivoUrl(url, precisaBaixar);
  const fallback = <FallbackAbrir url={url} nome={arquivo?.nomeOriginal} title={title} privado={privado} />;

  if (kind === "youtube") {
    const embed = youtubeEmbedUrl(url);
    if (!embed) return fallback;
    return (
      <div className="aspect-video w-full max-h-[min(70vh,480px)] bg-black rounded-lg overflow-hidden">
        <iframe
          src={embed}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (kind === "none") return fallback;
  // PDF externo: a maioria dos sites bloqueia iframe; abrir em nova aba (sem visualizador de terceiros)
  if (kind === "pdf" && !privado) return fallback;

  if (precisaBaixar && carregando) {
    return <p className="text-sm text-ink-soft px-1 py-6 text-center">Carregando arquivo…</p>;
  }
  if (erro || !src) {
    return (
      <p role="alert" className="text-sm text-danger-ink px-1 py-6 text-center">
        {erro ?? "Não foi possível carregar o arquivo."}
      </p>
    );
  }

  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- object URL do arquivo privado ou URL externa
      <img
        src={src}
        alt={title}
        className="max-w-full max-h-[min(70vh,560px)] w-auto h-auto object-contain mx-auto block rounded-md"
      />
    );
  }

  if (kind === "pdf") {
    // Visualizador nativo do navegador sobre a object URL (o arquivo nunca sai para outro site)
    return (
      <iframe
        src={src}
        title={title}
        className={`w-full ${frameMaxHeightClass} border-0 rounded-md bg-card`}
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        src={src}
        controls
        className={`w-full ${frameMaxHeightClass} rounded-md bg-black max-h-[min(70vh,480px)]`}
        preload="metadata"
      />
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 p-4 bg-card rounded-lg border border-line">
      <p className="text-xs text-ink-soft truncate">{title}</p>
      <audio src={src} controls className="w-full" preload="metadata" />
    </div>
  );
}

/**
 * Pré-visualização inline de anexos e materiais (imagem, PDF, áudio, vídeo, YouTube).
 * Por padrão vem recolhida; o conteúdo (e o download do arquivo privado) só carrega após
 * clicar em "Mostrar pré-visualização".
 */
export function AssetPreview({
  url,
  arquivo,
  tipo,
  title,
  frameMaxHeightClass = "min-h-[360px] max-h-[min(70vh,520px)]",
  className = "",
}: AssetPreviewProps) {
  const [aberto, setAberto] = useState(false);

  if (!url) return null;

  const privado = ehArquivoPrivado(url);
  const kind = getAssetPreviewKind(url, tipo, privado ? (arquivo?.mime ?? "application/octet-stream") : null);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-line bg-card">
        <span className="text-xs font-medium text-ink-soft">
          {aberto ? "Pré-visualização" : "Pré-visualização oculta"}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {aberto && (
            <>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-xs font-medium text-accent hover:text-accent-strong hover:underline"
              >
                Ocultar
              </button>
              <span className="text-gray-200" aria-hidden>
                |
              </span>
            </>
          )}
          <ArquivoBotao
            url={url}
            nome={arquivo?.nomeOriginal}
            baixar={privado && kind === "none"}
            className="text-xs text-accent font-medium hover:underline"
          >
            {privado && kind === "none" ? "Baixar" : "Abrir em nova aba"}
          </ArquivoBotao>
        </div>
      </div>

      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="w-full text-left px-3 py-4 text-sm text-ink-soft bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <FileText aria-hidden className="h-[18px] w-[18px] shrink-0 shrink-0" />
            Clique aqui para exibir a mídia nesta página.
          </span>
        </button>
      )}

      {aberto && (
        <div className="p-3 overflow-auto">
          <PreviewBody
            kind={kind}
            url={url}
            arquivo={arquivo}
            title={title}
            frameMaxHeightClass={frameMaxHeightClass}
          />
        </div>
      )}
    </div>
  );
}
