"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { iconesNav } from "./navIcons";

const navItems = [
  { href: "/professor", label: "Painel", icon: "painel" },
  { href: "/professor/turmas", label: "Turmas", icon: "turmas" },
  { href: "/professor/alunos", label: "Alunos", icon: "alunos" },
  { href: "/professor/materiais", label: "Materiais", icon: "materiais" },
  { href: "/professor/conteudo", label: "Conteúdo", icon: "conteudo" },
  { href: "/professor/progresso", label: "Progresso", icon: "progresso" },
];

/** horizontal = cabeçalho no desktop; vertical = dentro do menu do perfil; tabs = faixa rolável no mobile. */
export type TeacherNavVariant = "horizontal" | "vertical" | "tabs";

export function TeacherNav({
  variant = "horizontal",
}: {
  variant?: TeacherNavVariant;
}) {
  const pathname = usePathname() ?? "";
  const vertical = variant === "vertical";
  const tabs = variant === "tabs";
  const ref = useRef<HTMLElement>(null);

  // Na faixa rolável do mobile, traz a aba ativa para a área visível
  useEffect(() => {
    if (!tabs) return;
    const ativo = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (ativo && ref.current) ref.current.scrollLeft = ativo.offsetLeft - ref.current.clientWidth / 2 + ativo.clientWidth / 2;
  }, [tabs, pathname]);

  return (
    <nav
      ref={ref}
      aria-label={vertical ? "Menu principal" : tabs ? "Navegação da professora" : undefined}
      className={
        vertical
          ? "flex w-full flex-col py-1"
          : tabs
            ? "relative flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex items-center gap-1"
      }
    >
      {navItems.map((item) => {
        const Icone = iconesNav[item.icon];
        const isActive = item.href === "/professor" ? pathname === "/professor" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            role={vertical ? "menuitem" : undefined}
            aria-current={isActive ? "page" : undefined}
            className={
              vertical
                ? `flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-accent-soft text-accent-strong" : "text-ink hover:bg-gray-50"
                  }`
                : `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors ${
                    tabs ? "min-h-[44px] px-3.5" : "px-3 py-2 xl:px-3.5"
                  } ${
                    isActive
                      ? tabs
                        ? "bg-accent text-white shadow-sm"
                        : "bg-accent-soft text-accent-strong"
                      : tabs
                        ? "bg-card text-ink-soft ring-1 ring-line"
                        : "text-ink-soft hover:bg-gray-100 hover:text-ink"
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
