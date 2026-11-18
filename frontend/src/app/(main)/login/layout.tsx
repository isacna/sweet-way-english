import type { Metadata } from "next";

// A página é um componente de cliente e não pode exportar metadata: ela fica aqui.
// Fora da busca: /login?tipo=aluno e /login?tipo=professor são a mesma tela, e ela não tem conteúdo para quem procura.
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
