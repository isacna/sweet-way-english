import type { Viewport } from "next";
import { BarraLateral } from "@/components/BarraLateral";
import { InstalarApp } from "@/components/InstalarApp";
import { Navbar } from "@/components/Navbar";
import { NavbarUser } from "@/components/NavbarUser";
import { StudentNav } from "@/components/StudentNav";

// Barra do navegador / do app instalado na cor do tema escuro do aluno (o layout raiz usa a cor clara)
export const viewport: Viewport = {
  themeColor: "#0c0e13",
};

export default function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-area="aluno" className="min-h-screen bg-canvas lg:flex">
      {/* A partir de lg: barra lateral. Abaixo: cabeçalho + barra inferior. */}
      <BarraLateral area="aluno" />
      <div className="min-w-0 flex-1">
        <Navbar
          variant="dashboard"
          className="lg:hidden"
          logoHref="/aluno"
          center={<StudentNav />}
          right={<NavbarUser mobileNav={<StudentNav variant="vertical" />} />}
        />
        {/* pb extra no mobile: espaço para a barra inferior fixa */}
        <main className="mx-auto max-w-7xl px-4 pt-5 pb-28 sm:px-6 sm:pt-8 md:pb-12 lg:px-10">
          {/* Convite para instalar o app: só aparece no painel, no celular, quando o navegador oferece */}
          <InstalarApp />
          {children}
        </main>
      </div>
      <StudentNav variant="bottom" />
    </div>
  );
}
