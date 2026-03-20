import { Button } from "@/components/Button";

export function NavbarAuth() {
  return (
    <nav className="flex items-center gap-4">
      <Button href="/entrar" variant="ghost" size="sm">
        Entrar
      </Button>
      <Button href="/cadastrar" variant="primary" size="nav" className="rounded-full px-6">
        Começar agora
      </Button>
    </nav>
  );
}
