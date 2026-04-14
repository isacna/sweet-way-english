import { Navbar } from "@/components/Navbar";
import { NavbarUser } from "@/components/NavbarUser";
import { TeacherNav } from "@/components/TeacherNav";

async function getLogoUrl(): Promise<string | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
    const res = await fetch(`${base}/api/configuracoes`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      return data.logoUrl ?? null;
    }
  } catch {
    // fallback para logo estático
  }
  return null;
}

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoUrl = await getLogoUrl();

  return (
    <div className="min-h-screen bg-surface">
      <Navbar
        variant="dashboard"
        logoUrl={logoUrl}
        center={<TeacherNav />}
        right={<NavbarUser mobileNav={<TeacherNav variant="vertical" />} />}
      />
      <main className="p-8">{children}</main>
    </div>
  );
}
