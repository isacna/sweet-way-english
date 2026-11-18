import type { Metadata, Viewport } from "next";
import { HeroVideo } from "@/components/publico/HeroVideo";
import { OG_PADRAO, SITE_NOME, SITE_URL } from "@/lib/site";

const TITULO = "Sweet Way English: inglês do básico ao intermediário";
const DESCRICAO =
  "Curso de inglês no seu ritmo, com explicação em português, áudio em inglês americano e uma professora acompanhando.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: { ...OG_PADRAO, title: TITULO, description: DESCRICAO, url: "/" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0d12",
};

// Dados estruturados (schema.org): a escola e o curso. Só o que a página de fato mostra.
const dadosEstruturados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#escola`,
      name: SITE_NOME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icons/icon-512.png`,
    },
    {
      "@type": "Course",
      name: "Curso de inglês do básico ao intermediário",
      description: DESCRICAO,
      url: `${SITE_URL}/`,
      inLanguage: "pt-BR",
      provider: { "@id": `${SITE_URL}/#escola` },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // "<" escapado: o JSON não consegue fechar a tag <script>
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }}
      />
      <HeroVideo />
    </>
  );
}
