import type { Metadata, Viewport } from "next";
import { HeroVideo } from "@/components/publico/HeroVideo";

export const metadata: Metadata = {
  title: "Sweet Way English: inglês do básico ao intermediário",
  description: "Curso de inglês no seu ritmo, com explicação em português, áudio em inglês americano e uma professora acompanhando.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0d12",
};

export default function HomePage() {
  return <HeroVideo />;
}
