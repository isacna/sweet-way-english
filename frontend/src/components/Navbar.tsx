import Image from "next/image";
import Link from "next/link";

type NavbarVariant = "home" | "dashboard";

const variantStyles: Record<NavbarVariant, string> = {
  home: "fixed top-0 left-0 right-0 px-8 py-5 bg-[#F8F8FA]/90 backdrop-blur-sm",
  dashboard: "sticky top-0 px-8 py-4 bg-white border-b border-gray-200",
};

type NavbarProps = {
  variant?: NavbarVariant;
  center?: React.ReactNode;
  right: React.ReactNode;
  className?: string;
};

export function Navbar({
  variant = "home",
  center,
  right,
  className = "",
}: NavbarProps) {
  return (
    <header
      className={`z-50 flex items-center justify-between ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icons/graduation-cap.svg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-lg font-semibold text-[#1A1A1A]">
            Sweet Way English
          </span>
        </Link>
        {center}
      </div>
      {right}
    </header>
  );
}
