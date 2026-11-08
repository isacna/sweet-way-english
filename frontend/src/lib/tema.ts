// Preferência de tema (claro/escuro) da pessoa, guardada no navegador.
// "automatico" segue o padrão da área: aluno escuro, professora claro. As telas públicas sobre vídeo
// são sempre escuras. A regra de CSS está em src/styles/globals.css (html[data-preferencia-tema]).

import { useSyncExternalStore } from "react";
import { CHAVE_TEMA } from "./temaScript";

export { scriptTemaInicial } from "./temaScript";

export type PreferenciaTema = "automatico" | "claro" | "escuro";

const CHAVE = CHAVE_TEMA;
const EVENTO = "sw-tema-mudou";


function ler(): PreferenciaTema {
  try {
    const t = localStorage.getItem(CHAVE);
    return t === "claro" || t === "escuro" ? t : "automatico";
  } catch {
    return "automatico";
  }
}

export function definirPreferenciaTema(pref: PreferenciaTema) {
  const html = document.documentElement;
  try {
    if (pref === "automatico") localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, pref);
  } catch {
    // sem armazenamento (modo privado): vale só para esta página
  }
  if (pref === "automatico") html.removeAttribute("data-preferencia-tema");
  else html.setAttribute("data-preferencia-tema", pref);
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb); // outra aba mudou
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePreferenciaTema(): PreferenciaTema {
  return useSyncExternalStore(assinar, ler, () => "automatico");
}
