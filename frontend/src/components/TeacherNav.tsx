"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/professor", label: "Painel", icon: "grid" },
  { href: "/professor/turmas", label: "Turmas", icon: "users" },
  { href: "/professor/materiais", label: "Materiais", icon: "folder" },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const src =
    active ? `/icons/${icon}-active.svg` : `/icons/${icon}.svg`;
  return (
    <Image
      src={src}
      alt=""
      width={18}
      height={18}
      className="w-[18px] h-[18px]"
    />
  );
}

export function TeacherNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const isActive =
          item.href === "/professor"
            ? pathname === "/professor"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "text-[#8A4FF7] bg-[#8A4FF7]/10" : "text-[#4A4A4A] hover:bg-gray-100"
            }`}
          >
            <NavIcon icon={item.icon} active={isActive} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
