import Image from "next/image";
import Link from "next/link";

type NavbarVariant = "home" | "dashboard";

const variantStyles: Record<NavbarVariant, string> = {
  home: "fixed top-0 left-0 right-0 px-8 py-5 bg-white/95 backdrop-blur-sm border-b border-gray-100",
  dashboard: "sticky top-0 px-8 py-4 bg-white border-b border-gray-200",
};

function Logo({ variant }: { variant: NavbarVariant }) {
  return (
    <Image
      src="/logo.svg"
      alt="Sweet Way English"
      width={variant === "home" ? 400 : 400}
      height={48}
      className={
        variant === "home"
          ? "h-11 w-auto max-w-[400px] object-contain object-left sm:max-w-[450px] sm:h-12"
          : "h-10 w-auto max-w-[400px] object-contain object-left sm:max-w-[450px] sm:h-11"
      }
      priority
    />
  );
}

type NavbarProps = {
  variant?: NavbarVariant;
  center?: React.ReactNode;
  right: React.ReactNode;
  className?: string;
  /** Se omitido, no dashboard o padrão é /professor */
  logoHref?: string;
};

export function Navbar({
  variant = "home",
  center,
  right,
  className = "",
  logoHref: logoHrefProp,
}: NavbarProps) {
  const logoHref =
    logoHrefProp ?? (variant === "dashboard" ? "/professor" : "/home");

  return (
    <header
      className={`z-50 flex items-center justify-between ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-center gap-12">
        <Link href={logoHref} className="flex items-center gap-2 shrink-0">
          <Logo variant={variant} />
        </Link>
        {center}
      </div>
      {right}
    </header>
  );
}
