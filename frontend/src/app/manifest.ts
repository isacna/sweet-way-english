import type { MetadataRoute } from "next";

// Manifesto do app (servido em /manifest.webmanifest; o Next põe o <link rel="manifest"> sozinho).
// Só permite "instalar" o site na tela inicial do celular. Não há service worker: nada funciona offline
// e nada fica em cache por conta do app.
// Os ícones ficam em public/icons/ e saem do redemoinho do logo (ver frontend/CLAUDE.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sweet Way English",
    short_name: "Sweet Way",
    description: "Curso de inglês do básico ao intermediário, no seu ritmo.",
    lang: "pt-BR",
    // A guarda de rotas (src/proxy.ts) manda a professora para /professor e quem não entrou para o login
    start_url: "/aluno",
    scope: "/",
    display: "standalone",
    // Fundo do tema escuro da área do aluno (--color-canvas em src/styles/globals.css)
    background_color: "#0c0e13",
    theme_color: "#0c0e13",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
