"use client";

import { useEffect, useRef, useState } from "react";
import type { Midia } from "@/lib/curso";
import { BotaoOuvir } from "./BotaoOuvir";

function urlHttps(valor?: string) {
  try {
    const url = new URL(valor ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch { return null; }
}

export function MidiaLicao({ midia }: { midia: Midia }) {
  const [carregar, setCarregar] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const ref = useRef<HTMLMediaElement | null>(null);
  const url = urlHttps(midia.url);
  const videoId = url && ["youtube.com", "www.youtube.com"].includes(url.hostname) && url.pathname === "/watch"
    ? url.searchParams.get("v") : null;
  const youtube = videoId && /^[\w-]{11}$/.test(videoId);
  useEffect(() => () => {
    if (midia.modo === "voz" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [midia.modo]);

  const controles = {
    controls: true,
    preload: "none" as const,
    onError: () => setFalhou(true),
    onLoadedMetadata: () => { if (ref.current) ref.current.currentTime = midia.inicio ?? 0; },
    onPlay: () => {
      const media = ref.current;
      if (media && (media.currentTime < (midia.inicio ?? 0) || (midia.fim !== undefined && media.currentTime >= midia.fim))) media.currentTime = midia.inicio ?? 0;
    },
    onTimeUpdate: () => {
      if (ref.current && midia.fim !== undefined && ref.current.currentTime >= midia.fim) ref.current.pause();
    },
  };

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-gray-50 p-4" aria-label={midia.titulo}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-grape">{{ audio: "Escuta", video: "Vídeo", musica: "Música" }[midia.tipo]}</p>
        <h3 className="break-words text-lg font-semibold text-ink">{midia.titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{midia.orientacao}</p>
      </div>
      {midia.modo === "voz" && midia.transcricao && (
        <div className="flex flex-wrap items-center gap-3">
          <BotaoOuvir texto={midia.transcricao} comLento />
          <button type="button" className="min-h-11 touch-manipulation rounded-lg border border-line px-3 text-sm" onClick={() => window.speechSynthesis?.cancel()}>Parar áudio</button>
          <p className="text-xs text-ink-soft">Voz do navegador. Se o áudio não estiver disponível, use a transcrição.</p>
        </div>
      )}
      {midia.modo === "youtube" && youtube && (carregar ? (
        <iframe
          className="aspect-video w-full rounded-xl border-0"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${midia.inicio ?? 0}${midia.fim ? `&end=${midia.fim}` : ""}`}
          title={midia.titulo}
          allow="encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" onClick={() => setCarregar(true)} className="min-h-11 touch-manipulation rounded-xl bg-grape px-4 py-3 font-semibold text-white">Carregar vídeo do YouTube</button>
      ))}
      {midia.modo === "arquivo" && url && !falhou && (
        <>
          {midia.tipo === "video" ? (
            <video {...controles} ref={(el) => { ref.current = el; }} src={url.href} playsInline className="aspect-video w-full rounded-xl" aria-label={midia.titulo} />
          ) : (
            <audio {...controles} ref={(el) => { ref.current = el; }} src={url.href} className="w-full" aria-label={midia.titulo} />
          )}
          <label className="flex items-center gap-2 text-sm">Velocidade
            <select defaultValue="1" className="min-h-11 rounded-lg border border-line bg-white px-2 text-base" onChange={(e) => { if (ref.current) ref.current.playbackRate = Number(e.target.value); }}>
              <option value="0.75">0,75×</option><option value="1">Normal</option><option value="1.25">1,25×</option>
            </select>
          </label>
          <button type="button" className="min-h-11 touch-manipulation text-sm text-grape underline" onClick={() => { if (ref.current) { ref.current.currentTime = midia.inicio ?? 0; void ref.current.play().catch(() => setFalhou(true)); } }}>Repetir trecho</button>
        </>
      )}
      {falhou && <p role="status" className="text-sm text-ink-soft">Não foi possível carregar a mídia. Abra a fonte ou use a transcrição.</p>}
      {url && <a className="inline-flex min-h-11 items-center break-all text-sm text-grape underline" href={url.href} target="_blank" rel="noopener noreferrer">{midia.modo === "link" ? "Abrir atividade na fonte" : "Abrir na fonte se o player não funcionar"} ↗</a>}
      <p className="text-xs text-ink-soft">Fonte: {midia.fonte}</p>
      {midia.transcricao ? (
        <details className="rounded-xl border border-line bg-white p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Ler transcrição / apoio à escuta</summary>
          <p className="whitespace-pre-line break-words leading-7" lang="en">{midia.transcricao}</p>
        </details>
      ) : <p className="text-xs text-ink-soft">Consulte as legendas ou a transcrição na fonte.</p>}
    </section>
  );
}
