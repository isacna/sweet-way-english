"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: { href: string; label: string; icon: string }[] = [
  { href: "/aluno", label: "Painel", icon: "grid" },
  { href: "/aluno/turmas", label: "Turmas", icon: "users" },
  { href: "/aluno/feedbacks", label: "Feedbacks", icon: "check-square" },
  { href: "/aluno/materiais", label: "Materiais", icon: "folder" },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const comAssetAtivo =
    icon === "grid" || icon === "users" || icon === "folder";
  const src =
    comAssetAtivo && active
      ? `/icons/${icon}-active.svg`
      : `/icons/${icon}.svg`;
  return (
    <Image
      src={src}
      alt=""
      width={18}
      height={18}
      className={`w-[18px] h-[18px] ${icon === "check-square" && active ? "opacity-100" : icon === "check-square" ? "opacity-70" : ""}`}
    />
  );
}

export type StudentNavVariant = "horizontal" | "vertical";

export function StudentNav({
  variant = "horizontal",
}: {
  variant?: StudentNavVariant;
}) {
  const pathname = usePathname();
  const vertical = variant === "vertical";

  return (
    <nav
      aria-label={vertical ? "Menu principal" : undefined}
      className={
        vertical
          ? "flex w-full flex-col"
          : "flex w-max max-w-none items-center gap-1 flex-nowrap md:w-full md:max-w-full md:justify-center"
      }
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/aluno"
            ? pathname === "/aluno"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            role={vertical ? "menuitem" : undefined}
            className={
              vertical
                ? `flex w-full items-center gap-3 px-3 py-3 text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0 ${
                    isActive
                      ? "text-[#1898DC] bg-[#1898DC]/10"
                      : "text-[#1A1A1A] hover:bg-gray-50"
                  }`
                : `flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-[#1898DC] bg-[#1898DC]/10"
                      : "text-[#4A4A4A] hover:bg-gray-100"
                  }`
            }
          >
            <NavIcon icon={item.icon} active={isActive} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
