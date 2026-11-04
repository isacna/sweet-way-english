"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getStoredUser } from "@/lib/api";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (
    (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  );
}

function rotuloPapel(role: string): string {
  if (role === "professor") return "Professor";
  if (role === "aluno") return "Aluno";
  return role;
}

type NavbarUserProps = {
  /** No mobile: links do menu (Painel, Turmas…) dentro do dropdown do perfil. */
  mobileNav?: ReactNode;
};

export function NavbarUser({ mobileNav }: NavbarUserProps) {
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setMontado(true);
    });
  }, []);

  useEffect(() => {
    if (!aberto) return;

    function fecharSeFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }

    function fecharEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", fecharSeFora);
    document.addEventListener("keydown", fecharEscape);
    return () => {
      document.removeEventListener("mousedown", fecharSeFora);
      document.removeEventListener("keydown", fecharEscape);
    };
  }, [aberto]);

  function sair() {
    const u = getStoredUser();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const tipo = u?.role === "professor" ? "professor" : "aluno";
    window.location.href = `/login?tipo=${tipo}`;
  }

  const u = montado ? getStoredUser() : null;
  const nome = u?.nome ?? null;
  const email = u?.email ?? null;
  const role = u?.role ?? null;

  const exibirNome = nome ?? "…";
  const exibirPapel = role ? rotuloPapel(role) : "…";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex min-h-[44px] items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-gray-100 sm:gap-3 sm:pl-3"
      >
        <div className="text-right hidden sm:block min-w-0 max-w-[180px]">
          <p className="text-sm font-medium text-ink truncate">
            {exibirNome}
          </p>
          <p className="text-xs text-ink-soft text-left">{exibirPapel}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-candy-soft via-grape-soft to-sky-soft ring-2 ring-white shadow-sm"
          aria-hidden
        >
          <span className="font-display text-sm font-semibold text-accent-strong">
            {nome ? iniciais(nome) : "…"}
          </span>
        </div>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-[60] mt-2 w-[min(100vw-2rem,280px)] origin-top-right animate-pop-in overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-lg"
        >
          <div className="border-b border-line bg-gradient-to-br from-grape-mist to-white px-4 py-3">
            <p className="text-sm font-semibold text-ink truncate">
              {exibirNome}
            </p>
            {email && (
              <p className="text-xs text-ink-soft truncate mt-0.5">{email}</p>
            )}
            <p className="mt-1.5 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">
              {exibirPapel}
            </p>
          </div>
          {mobileNav ? (
            <div
              className="md:hidden"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a[href]")) {
                  setAberto(false);
                }
              }}
            >
              {mobileNav}
            </div>
          ) : null}
          {role === "professor" && (
            <Link
              href="/professor/configuracoes"
              role="menuitem"
              onClick={() => setAberto(false)}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-gray-50"
            >
              <Settings aria-hidden className="h-[18px] w-[18px] text-ink-faint" />
              Configurações
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              sair();
            }}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-danger transition-colors hover:bg-danger-soft ${
              mobileNav ? "border-t border-line md:border-t-0" : ""
            }`}
          >
            <LogOut aria-hidden className="h-[18px] w-[18px]" />
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
