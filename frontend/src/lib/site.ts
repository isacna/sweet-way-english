import type { Metadata } from "next";

/**
 * Endereço público do site, usado nas URLs absolutas de SEO (canonical, Open Graph, robots.txt, sitemap.xml).
 * As páginas públicas são geradas no `next build`, então `SITE_URL` só tem efeito se definida no build;
 * sem ela vale o domínio de produção.
 */
export const SITE_URL = (process.env.SITE_URL ?? "https://sweetwayenglish.com.br").replace(/\/$/, "");

export const SITE_NOME = "Sweet Way English";

/**
 * Open Graph comum (prévia do link em WhatsApp, Instagram etc.). A imagem é o primeiro quadro do vídeo da página
 * inicial. Uma página que define o próprio `openGraph` substitui o do layout inteiro, então ela deve espalhar este.
 */
export const OG_PADRAO: NonNullable<Metadata["openGraph"]> = {
  type: "website",
  siteName: SITE_NOME,
  locale: "pt_BR",
  images: [{ url: "/video/fundo-poster.jpg", width: 1112, height: 720, alt: "Lago e montanhas ao amanhecer" }],
};

export const SITE_DESCRICAO =
  "Curso de inglês do básico ao intermediário, no seu ritmo, com explicação em português e uma professora acompanhando.";
