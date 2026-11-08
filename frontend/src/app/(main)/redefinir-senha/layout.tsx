import type { Metadata } from "next";

// O token de redefinição vai na URL: não repassar a URL como Referer nem deixar a página ser indexada
export const metadata: Metadata = {
  title: "Criar nova senha",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function RedefinirSenhaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
