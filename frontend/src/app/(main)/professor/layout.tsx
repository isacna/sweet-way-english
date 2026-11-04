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
    <div data-area="professor" className="min-h-screen bg-canvas">
      <Navbar
        variant="dashboard"
        logoUrl={logoUrl}
        center={<TeacherNav />}
        mobileBelow={<TeacherNav variant="tabs" />}
        right={<NavbarUser mobileNav={<TeacherNav variant="vertical" />} />}
      />
      <main className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
