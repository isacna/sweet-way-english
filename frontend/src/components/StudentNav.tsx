"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { iconesNav } from "./navIcons";

const navItems: { href: string; label: string; icon: string }[] = [
  { href: "/aluno", label: "Painel", icon: "painel" },
  { href: "/aluno/curso", label: "Curso", icon: "curso" },
  { href: "/aluno/turmas", label: "Turmas", icon: "turmas" },
  { href: "/aluno/feedbacks", label: "Feedbacks", icon: "feedbacks" },
  { href: "/aluno/materiais", label: "Materiais", icon: "materiais" },
];

/** Telas de foco (lição, revisão, teste): sem barra inferior, para a barra de ação ficar livre. */
export function emModoFoco(pathname: string) {
  return /^\/aluno\/curso\/(licao|revisao|modulo)/.test(pathname);
}

/** horizontal = cabeçalho no desktop; vertical = menu do perfil; bottom = barra inferior no mobile. */
export type StudentNavVariant = "horizontal" | "vertical" | "bottom";

export function StudentNav({
  variant = "horizontal",
}: {
  variant?: StudentNavVariant;
}) {
  const pathname = usePathname() ?? "";
  const ativo = (href: string) => (href === "/aluno" ? pathname === "/aluno" : pathname.startsWith(href));

  if (variant === "bottom") {
    if (emModoFoco(pathname)) return null;
    return (
      <nav
        aria-label="Navegação do aluno"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 pt-1.5 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {navItems.map((item) => {
            const Icone = iconesNav[item.icon];
            const isActive = ativo(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors ${
                    isActive ? "text-grape" : "text-ink-faint hover:text-ink"
                  }`}
                >
                  <span
                    className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive ? "bg-grape-soft" : "group-hover:bg-gray-100"
                    }`}
                  >
                    <Icone className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  const vertical = variant === "vertical";
  return (
    <nav
      aria-label={vertical ? "Menu principal" : undefined}
      className={vertical ? "flex w-full flex-col py-1" : "flex items-center gap-1"}
    >
      {navItems.map((item) => {
        const Icone = iconesNav[item.icon];
        const isActive = ativo(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            role={vertical ? "menuitem" : undefined}
            aria-current={isActive ? "page" : undefined}
            className={
              vertical
                ? `flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-grape-soft text-grape" : "text-ink hover:bg-gray-50"
                  }`
                : `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors lg:px-4 ${
                    isActive ? "bg-grape-soft text-grape" : "text-ink-soft hover:bg-gray-100 hover:text-ink"
                  }`
            }
          >
            <Icone className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
