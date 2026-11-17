"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Smartphone, X } from "lucide-react";

// Convite para instalar o site na tela inicial. Só aparece quando o navegador dispara
// `beforeinstallprompt` (Chrome/Edge no Android); no iOS e nos demais nada é renderizado.
// Fechar o convite fica lembrado no navegador.

const CHAVE = "sw-instalar-app-dispensado";

/** Evento do Chrome que ainda não está nos tipos do DOM. */
type EventoInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function jaDispensou(): boolean {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

export function InstalarApp() {
  const pathname = usePathname();
  const [evento, setEvento] = useState<EventoInstalacao | null>(null);

  useEffect(() => {
    const aoOferecer = (e: Event) => {
      if (jaDispensou()) return; // deixa o navegador seguir com o comportamento padrão dele
      e.preventDefault();
      setEvento(e as EventoInstalacao);
    };
    const aoInstalar = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", aoOferecer);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoOferecer);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  // Só no painel do aluno, e só em telas de celular/tablet (a partir de lg fica escondido por CSS)
  if (!evento || pathname !== "/aluno") return null;

  const dispensar = () => {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      // sem armazenamento (modo privado): some só nesta visita
    }
    setEvento(null);
  };

  const instalar = async () => {
    try {
      await evento.prompt();
      await evento.userChoice;
    } catch {
      // o evento só pode ser usado uma vez; se falhar, apenas some
    }
    // Aceitando ou não, o evento já foi gasto: o navegador dispara outro se a pessoa puder instalar depois
    setEvento(null);
  };

  return (
    <section
      aria-label="Instalar o app"
      className="card mb-5 flex items-center gap-3 p-3 pl-4 lg:hidden"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grape-soft text-grape"
      >
        <Smartphone className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Instalar o app</p>
        <p className="text-sm text-ink-soft">Abra o curso direto da tela inicial do celular.</p>
      </div>
      <button
        type="button"
        onClick={instalar}
        className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-grape px-4 text-sm font-semibold text-white transition-colors hover:bg-grape-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-grape-bright"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={dispensar}
        aria-label="Agora não"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-grape-bright"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </section>
  );
}
