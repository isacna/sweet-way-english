import type { Metadata } from "next";

// O token de cancelamento vai na URL: não repassar a URL como Referer nem deixar a página ser indexada
export const metadata: Metadata = {
  title: "Lembretes de estudo",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function CancelarLembretesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
