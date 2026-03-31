"use client";

import Image from "next/image";
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
        className="flex items-center gap-2 sm:gap-3 rounded-xl pl-1 pr-2 py-1.5 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#8A4FF7]/30"
      >
        <div className="text-right hidden sm:block min-w-0 max-w-[180px]">
          <p className="text-sm font-medium text-[#1A1A1A] truncate">
            {exibirNome}
          </p>
          <p className="text-xs text-[#4A4A4A] text-left">{exibirPapel}</p>
        </div>
        <div
          className="w-10 h-10 rounded-full bg-[#8A4FF7]/15 flex items-center justify-center shrink-0"
          aria-hidden
        >
          <span className="text-[#8A4FF7] font-semibold text-sm">
            {nome ? iniciais(nome) : "…"}
          </span>
        </div>
        <Image
          src="/icons/chevron-down.svg"
          alt=""
          width={16}
          height={16}
          className={`shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[min(100vw-2rem,260px)] rounded-xl border border-gray-200 bg-white py-2 shadow-lg z-[60]"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">
              {exibirNome}
            </p>
            {email && (
              <p className="text-xs text-[#4A4A4A] truncate mt-0.5">{email}</p>
            )}
            <p className="text-xs text-[#8A4FF7] font-medium mt-1">
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
              className="flex w-full items-center px-4 py-3 text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors"
            >
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
            className={`w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
              mobileNav ? "border-t border-gray-100 md:border-t-0" : ""
            }`}
          >
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
