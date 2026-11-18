import type { Metadata } from "next";

// A página é um componente de cliente e não pode exportar metadata: ela fica aqui.
export const metadata: Metadata = {
  title: "Criar conta no curso de inglês",
  description:
    "Crie sua conta no Sweet Way English e comece o curso de inglês pelo nível A1, no seu ritmo, com explicação em português.",
  alternates: { canonical: "/cadastro" },
};

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
