"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { definirPreferenciaTema, usePreferenciaTema, type PreferenciaTema } from "@/lib/tema";

const opcoes: { valor: PreferenciaTema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "automatico", rotulo: "Automático", Icone: Monitor },
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
];

/** Escolha de tema (Automático = padrão da área). Pensado para o menu do perfil. */
export function SeletorTema() {
  const atual = usePreferenciaTema();
  return (
    <fieldset className="px-3 py-2">
      <legend className="mb-2 text-xs font-semibold text-ink-faint">Tema</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-gray-50 p-1">
        {opcoes.map(({ valor, rotulo, Icone }) => {
          const ativo = atual === valor;
          return (
            <label
              key={valor}
              className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg text-[0.7rem] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#f8b285] ${
                ativo ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="tema"
                value={valor}
                checked={ativo}
                onChange={() => definirPreferenciaTema(valor)}
                className="sr-only"
              />
              <Icone className="h-4 w-4" aria-hidden />
              {rotulo}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
