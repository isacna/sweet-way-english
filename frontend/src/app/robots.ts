import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Servido em /robots.txt. As áreas logadas, a API e as páginas com token ou código na URL ficam fora do rastreio.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/aluno", "/professor", "/api/", "/certificado/", "/lembretes/", "/redefinir-senha"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
