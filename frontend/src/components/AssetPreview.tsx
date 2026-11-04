"use client";

import { useState } from "react";
import {
  getAssetPreviewKind,
  youtubeEmbedUrl,
  type AssetPreviewKind,
} from "@/lib/assetPreviewKind";
import { Download, FileText } from "lucide-react";

type AssetPreviewProps = {
  /** URL absoluta (use `assetUrl` para caminhos `/uploads/...`). */
  fullUrl: string | null;
  /** Tipo do material (`pdf`, `video`, …) ou omitido para anexos. */
  tipo?: string | null;
  /** Rótulo para leitores de tela / título do iframe. */
  title: string;
  /** Altura máxima da área de preview (iframe PDF, vídeo). */
  frameMaxHeightClass?: string;
  className?: string;
};

function FallbackAbrir({
  fullUrl,
  title,
}: {
  fullUrl: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
      <FileText aria-hidden className="h-[40px] w-[40px] shrink-0" />
      <p className="text-sm text-ink-soft max-w-sm">
        Não há pré-visualização embutida para este arquivo ou link. Abra em
        nova aba para ver o conteúdo.
      </p>
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong"
      >
        <Download aria-hidden className="h-[16px] w-[16px] shrink-0" />
        Abrir em nova aba
      </a>
      <span className="sr-only">{title}</span>
    </div>
  );
}

function PreviewBody({
  kind,
  fullUrl,
  title,
  frameMaxHeightClass,
}: {
  kind: AssetPreviewKind;
  fullUrl: string;
  title: string;
  frameMaxHeightClass: string;
}) {
  if (kind === "youtube") {
    const embed = youtubeEmbedUrl(fullUrl);
    if (!embed) return <FallbackAbrir fullUrl={fullUrl} title={title} />;
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

  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URLs dinâmicas do backend (uploads)
      <img
        src={fullUrl}
        alt={title}
        className="max-w-full max-h-[min(70vh,560px)] w-auto h-auto object-contain mx-auto block rounded-md"
      />
    );
  }

  if (kind === "pdf") {
    // PDFs de URLs externas são bloqueados por X-Frame-Options na maioria dos sites.
    // Para esses casos, redireciona pelo Google Docs Viewer que não tem essa restrição.
    const isInternal = fullUrl.includes("/uploads/");
    const src = isInternal
      ? fullUrl
      : `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`;
    return (
      <iframe
        src={src}
        title={title}
        className={`w-full ${frameMaxHeightClass} border-0 rounded-md bg-white`}
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        src={fullUrl}
        controls
        className={`w-full ${frameMaxHeightClass} rounded-md bg-black max-h-[min(70vh,480px)]`}
        preload="metadata"
      />
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex flex-col items-stretch gap-2 p-4 bg-white rounded-lg border border-gray-100">
        <p className="text-xs text-ink-soft truncate">{title}</p>
        <audio src={fullUrl} controls className="w-full" preload="metadata" />
      </div>
    );
  }

  return <FallbackAbrir fullUrl={fullUrl} title={title} />;
}

/**
 * Pré-visualização inline de anexos e materiais (imagem, PDF, áudio, vídeo, YouTube).
 * Por padrão vem recolhida; o conteúdo pesado só carrega após clicar em "Mostrar pré-visualização".
 */
export function AssetPreview({
  fullUrl,
  tipo,
  title,
  frameMaxHeightClass = "min-h-[360px] max-h-[min(70vh,520px)]",
  className = "",
}: AssetPreviewProps) {
  const [aberto, setAberto] = useState(false);

  if (!fullUrl) return null;

  const kind = getAssetPreviewKind(fullUrl, tipo);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-white">
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
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent font-medium hover:underline"
          >
            Abrir em nova aba
          </a>
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
            fullUrl={fullUrl}
            title={title}
            frameMaxHeightClass={frameMaxHeightClass}
          />
        </div>
      )}
    </div>
  );
}
