import type { Metadata } from "next";

// A página é um componente de cliente e não pode exportar metadata: ela fica aqui.
export const metadata: Metadata = {
  title: "Esqueci minha senha",
  robots: { index: false, follow: true },
};

export default function EsqueciSenhaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
