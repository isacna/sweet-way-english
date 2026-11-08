"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo de fundo da home e das telas de entrada (lago e montanhas ao amanhecer), hospedado no próprio site
 * (`public/video/`, 720p sem áudio: WebM VP9 ~0,5 MB e MP4 H.264 ~1,2 MB). O poster é o primeiro quadro, então a
 * tela fica igual enquanto o vídeo carrega.
 *
 * Só começa a tocar depois de montar, e não toca com `prefers-reduced-motion: reduce` nem com economia de dados
 * (`Save-Data`): nesses casos fica só o poster. Para regerar os arquivos, veja frontend/CLAUDE.md.
 */
export const VIDEO_FUNDO = {
  webm: "/video/fundo.webm",
  mp4: "/video/fundo.mp4",
  poster: "/video/fundo-poster.jpg",
} as const;

const consultaMovimento = "(prefers-reduced-motion: reduce)";

function economizarDados() {
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conexao?.saveData === true;
}

export function VideoFundo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const mq = window.matchMedia(consultaMovimento);
    const atualizar = () => {
      if (mq.matches || economizarDados()) {
        video.pause();
      } else {
        // Autoplay mudo é permitido; se o navegador recusar mesmo assim, fica o poster
        void video.play().catch(() => {});
      }
    };
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      poster={VIDEO_FUNDO.poster}
      preload="metadata"
      muted
      loop
      playsInline
      aria-hidden
      tabIndex={-1}
    >
      <source src={VIDEO_FUNDO.webm} type="video/webm" />
      <source src={VIDEO_FUNDO.mp4} type="video/mp4" />
    </video>
  );
}
