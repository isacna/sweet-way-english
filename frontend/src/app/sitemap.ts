import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Servido em /sitemap.xml: só as páginas públicas que devem aparecer na busca.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/cadastro`, changeFrequency: "yearly", priority: 0.8 },
  ];
}
