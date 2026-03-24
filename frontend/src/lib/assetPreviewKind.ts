/** Tipos de pré-visualização inline (sem baixar o arquivo). */
export type AssetPreviewKind =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "youtube"
  | "none";

function pathnameExtension(url: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() ?? "";
    const i = base.lastIndexOf(".");
    return i >= 0 ? base.slice(i + 1).toLowerCase() : "";
  } catch {
    return "";
  }
}

/** Extrai URL de embed do YouTube a partir de vários formatos de link. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/\/embed\/([^/?]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Define como exibir o recurso em tela (imagem, PDF, vídeo, áudio, YouTube ou nenhum).
 * `tipo` vem de Material (pdf, audio, video, link) ou fica vazio para anexos de alunos.
 */
export function getAssetPreviewKind(
  fullUrl: string,
  tipo?: string | null
): AssetPreviewKind {
  if (!fullUrl.trim()) return "none";

  if (youtubeEmbedUrl(fullUrl)) return "youtube";

  const ext = pathnameExtension(fullUrl);
  const imageExt = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
  if (imageExt.includes(ext)) return "image";

  if (ext === "pdf" || tipo === "pdf") return "pdf";

  const videoExt = ["mp4", "webm", "ogg", "mov"];
  if (videoExt.includes(ext) || tipo === "video") return "video";

  const audioExt = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
  if (audioExt.includes(ext) || tipo === "audio") return "audio";

  return "none";
}
