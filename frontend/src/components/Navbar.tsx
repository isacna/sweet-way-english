import Link from "next/link";
import { BrandMark } from "./BrandMark";

type NavbarVariant = "home" | "dashboard";

function Logo({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt="Sweet Way English"
        className="h-10 w-auto max-w-[55vw] object-contain object-left sm:h-12"
      />
    );
  }
  return <BrandMark />;
}

type NavbarProps = {
  variant?: NavbarVariant;
  center?: React.ReactNode;
  right: React.ReactNode;
  className?: string;
  /** Se omitido, no dashboard o padrão é /professor */
  logoHref?: string;
  /** URL do logo customizado (substitui o logo estático padrão) */
  logoUrl?: string | null;
  /** Conteúdo extra abaixo da barra, só no mobile (ex.: abas roláveis da professora). */
  mobileBelow?: React.ReactNode;
};

export function Navbar({
  variant = "home",
  center,
  right,
  className = "",
  logoHref: logoHrefProp,
  logoUrl,
  mobileBelow,
}: NavbarProps) {
  const logoHref = logoHrefProp ?? (variant === "dashboard" ? "/professor" : "/home");

  return (
    <header className={`sticky top-0 z-50 border-b border-line bg-card/80 backdrop-blur-xl backdrop-saturate-150 ${className}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:gap-8">
        <Link href={logoHref} className="flex min-w-0 shrink-0 items-center rounded-xl transition-opacity hover:opacity-85">
          <Logo logoUrl={logoUrl} />
        </Link>
        {center ? <div className="hidden min-w-0 flex-1 justify-center md:flex">{center}</div> : null}
        <div className="shrink-0">{right}</div>
      </div>
      {mobileBelow ? <div className="md:hidden">{mobileBelow}</div> : null}
    </header>
  );
}
