import Image from "next/image";
import Link from "next/link";

type NavbarVariant = "home" | "dashboard";

const variantStyles: Record<NavbarVariant, string> = {
  home:
    "fixed top-0 left-0 right-0 px-4 sm:px-8 py-5 bg-white/95 backdrop-blur-sm border-b border-gray-100",
  dashboard:
    "sticky top-0 px-4 sm:px-8 py-3 sm:py-4 bg-white border-b border-gray-200",
};

function Logo({ variant }: { variant: NavbarVariant }) {
  return (
    <Image
      src="/logo-sweet.png"
      alt="Sweet Way English"
      width={400}
      height={120}
      className={
        variant === "home"
          ? "h-14 w-auto max-w-[min(90vw,320px)] object-contain object-left sm:h-16 sm:max-w-[400px] md:h-[4.5rem] md:max-w-[460px]"
          : "h-12 w-auto max-w-[min(55vw,260px)] object-contain object-left sm:h-14 sm:max-w-[300px] md:h-16 md:max-w-[360px] lg:max-w-[400px]"
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
      className={`z-50 flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-3 md:gap-6 lg:gap-10 ${variantStyles[variant]} ${className}`}
    >
      <Link
        href={logoHref}
        className="order-1 flex items-center gap-2 shrink-0 min-w-0"
      >
        <Logo variant={variant} />
      </Link>
      {center ? (
        <div className="order-3 hidden w-full min-w-0 basis-full justify-start border-t border-gray-100 pt-3 md:order-2 md:flex md:basis-auto md:flex-1 md:justify-center md:border-t-0 md:pt-0 md:overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
          {center}
        </div>
      ) : null}
      <div className="order-2 shrink-0 md:order-3">{right}</div>
    </header>
  );
}
