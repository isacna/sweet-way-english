"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getStoredUser, sair as encerrarSessao, validarSessao } from "@/lib/api";
import { SeletorTema } from "./SeletorTema";

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
  /** "lateral" = cartão no pé da barra lateral (o menu abre para cima). */
  variante?: "barra" | "lateral";
  /** Na lateral encolhida: só o avatar. */
  compacto?: boolean;
  /** Confere a sessão ao montar. Com duas instâncias na tela (cabeçalho + lateral), só uma confere. */
  validar?: boolean;
};

export function NavbarUser({ mobileNav, variante = "barra", compacto = false, validar = true }: NavbarUserProps) {
  const lateral = variante === "lateral";
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setMontado(true);
    });
  }, []);

  // Confere a sessão (cookie) no servidor ao abrir a área logada: o `user` do localStorage é só cache.
  // Cookie expirado ou senha trocada em outro lugar → volta para o login.
  const [, setValidado] = useState(false);
  useEffect(() => {
    if (!validar) return;
    let cancelado = false;
    const tipoAntes = getStoredUser()?.role === "professor" ? "professor" : "aluno";
    validarSessao()
      .then((u) => {
        if (cancelado) return;
        if (!u) {
          window.location.href = `/login?tipo=${tipoAntes}`;
          return;
        }
        setValidado(true);
      })
      .catch(() => {
        // Sem conexão com a API: mantém a tela; as chamadas da página mostram o erro
      });
    return () => {
      cancelado = true;
    };
  }, [validar]);

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

  async function sair() {
    const u = getStoredUser();
    await encerrarSessao();
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
        aria-label={lateral && compacto ? `Conta de ${exibirNome}` : undefined}
        className={
          lateral
            ? `flex min-h-[52px] w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-gray-100 ${
                compacto ? "justify-center" : ""
              }`
            : "flex min-h-[44px] items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-gray-100 sm:gap-3 sm:pl-3"
        }
      >
        <div
          className={
            lateral
              ? compacto
                ? "hidden"
                : "min-w-0 flex-1"
              : "text-right hidden sm:block min-w-0 max-w-[180px]"
          }
        >
          <p className="text-sm font-medium text-ink truncate">
            {exibirNome}
          </p>
          <p className="text-xs text-ink-soft text-left">{exibirPapel}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-candy-soft via-grape-soft to-sky-soft ring-2 ring-card shadow-sm ${
            lateral ? "-order-1" : ""
          }`}
          aria-hidden
        >
          <span className="font-display text-sm font-semibold text-grape">
            {nome ? iniciais(nome) : "…"}
          </span>
        </div>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${
            lateral ? (compacto ? "hidden" : aberto ? "" : "rotate-180") : aberto ? "rotate-180" : ""
          }`}
        />
      </button>

      {aberto && (
        <div
          role="menu"
          className={`absolute z-[60] w-[min(100vw-2rem,280px)] animate-pop-in overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-lg ${
            lateral ? "bottom-full left-0 mb-2 origin-bottom-left" : "right-0 mt-2 origin-top-right"
          }`}
        >
          <div className="border-b border-line bg-gradient-to-br from-grape-mist to-card px-4 py-3">
            <p className="text-sm font-semibold text-ink truncate">
              {exibirNome}
            </p>
            {email && (
              <p className="text-xs text-ink-soft truncate mt-0.5">{email}</p>
            )}
            <p className="mt-1.5 inline-block rounded-full bg-grape-soft px-2 py-0.5 text-xs font-semibold text-grape">
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
          {role === "professor" && !lateral && (
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
          <div role="none" className="border-t border-line">
            <SeletorTema />
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              void sair();
            }}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left text-sm font-semibold text-danger-ink transition-colors hover:bg-danger-soft"
          >
            <LogOut aria-hidden className="h-[18px] w-[18px]" />
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
