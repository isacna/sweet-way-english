import { Navbar } from "@/components/Navbar";
import { NavbarUser } from "@/components/NavbarUser";
import { TeacherNav } from "@/components/TeacherNav";

/**
 * Server component: não passa pelo rewrite `/api`, então chama o backend direto (`BACKEND_URL`, lido em runtime).
 * O endereço da logo vem absoluto (`APP_URL` do backend); se for a rota da própria API, vira relativo para o navegador
 * buscá-lo na mesma origem (funciona pelo IP da rede e atrás do Caddy).
 */
async function getLogoUrl(): Promise<string | null> {
  try {
    const base = (process.env.BACKEND_URL ?? "http://localhost:3333").replace(/\/$/, "");
    const res = await fetch(`${base}/api/configuracoes`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { logoUrl?: string | null };
      return logoNaMesmaOrigem(data.logoUrl ?? null);
    }
  } catch {
    // fallback para logo estático
  }
  return null;
}

function logoNaMesmaOrigem(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, "http://interno");
    return u.pathname.startsWith("/api/") ? `${u.pathname}${u.search}` : url;
  } catch {
    return url;
  }
}

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoUrl = await getLogoUrl();

  return (
    <div
      data-area="professor"
      className="min-h-screen bg-canvas text-ink [&_input[type=checkbox]]:accent-accent [&_input[type=radio]]:accent-accent"
    >
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
