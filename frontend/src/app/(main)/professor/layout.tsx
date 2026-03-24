import { Navbar } from "@/components/Navbar";
import { NavbarUser } from "@/components/NavbarUser";
import { TeacherNav } from "@/components/TeacherNav";

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <Navbar
        variant="dashboard"
        center={<TeacherNav />}
        right={<NavbarUser mobileNav={<TeacherNav variant="vertical" />} />}
      />
      <main className="p-8">{children}</main>
    </div>
  );
}
