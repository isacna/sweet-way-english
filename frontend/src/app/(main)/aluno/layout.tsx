import { Navbar } from "@/components/Navbar";
import { NavbarUser } from "@/components/NavbarUser";
import { StudentNav } from "@/components/StudentNav";

export default function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-area="aluno" className="min-h-screen bg-canvas">
      <Navbar
        variant="dashboard"
        logoHref="/aluno"
        center={<StudentNav />}
        right={<NavbarUser mobileNav={<StudentNav variant="vertical" />} />}
      />
      {/* pb extra no mobile: espaço para a barra inferior fixa */}
      <main className="mx-auto max-w-7xl px-4 pt-5 pb-28 sm:px-6 sm:pt-8 md:pb-12">{children}</main>
      <StudentNav variant="bottom" />
    </div>
  );
}
