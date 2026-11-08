/**
 * E-mails ficam sempre em minúsculo e sem espaços nas pontas (índice único em `Usuario.email`).
 * Use em todo lugar que grava ou busca um usuário pelo e-mail.
 */
export function normalizarEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase();
}
