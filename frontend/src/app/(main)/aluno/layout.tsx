import { Navbar } from "@/components/Navbar";
import { NavbarUser } from "@/components/NavbarUser";
import { StudentNav } from "@/components/StudentNav";

export default function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <Navbar
        variant="dashboard"
        logoHref="/aluno"
        center={<StudentNav />}
        right={<NavbarUser />}
      />
      <main className="p-8">{children}</main>
    </div>
  );
}
