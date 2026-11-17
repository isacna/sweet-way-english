// Dados só de exibição que dependem do navegador (usuário em cache, data de hoje).
// useSyncExternalStore devolve "" no servidor e o valor real no cliente, sem erro de hidratação.

import { useSyncExternalStore } from "react";
import { getStoredUser } from "./api";

const semAssinatura = () => () => {};

/** Primeiro nome do usuário em cache ("" até montar ou sem cache). */
export function usePrimeiroNome(): string {
  return useSyncExternalStore(
    semAssinatura,
    () => getStoredUser()?.nome.trim().split(/\s+/)[0] ?? "",
    () => "",
  );
}

/** "quarta-feira, 11 de novembro" ("" no servidor). */
export function useHojePt(): string {
  return useSyncExternalStore(
    semAssinatura,
    () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
    () => "",
  );
}
