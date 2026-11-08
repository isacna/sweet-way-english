/**
 * Base das chamadas à API: sempre relativa (`/api`, mesma origem). Em dev e no `next start` o Next repassa `/api/*`
 * ao backend (`rewrites` em `next.config.ts`, `BACKEND_URL`); em produção o Caddy manda `/api/*` direto ao backend.
 * Assim o cookie de sessão é do próprio site e o acesso pelo IP da rede (celular) funciona sem configurar nada.
 */
export const API_BASE = "/api";

/** Rotas REST do backend (`server.ts` monta em `/api`). Ver `backend/src/http/routes/index.ts`. */
export const apiPaths = {
  professorAlunos: "/professor/alunos",
  professorAluno: (id: number) => `/professor/alunos/${id}`,
  /** Feedbacks do aluno autenticado */
  alunoMeFeedbacks: "/alunos/me/feedbacks",
} as const;

export type UsuarioSessao = {
  id: number;
  nome: string;
  email: string;
  role: string;
  admin?: boolean;
};

const CHAVE_USUARIO = "user";

/** Versões antigas guardavam o JWT no localStorage; hoje a sessão é um cookie httpOnly que o JS não lê. */
function removerTokenLegado() {
  try {
    localStorage.removeItem("token");
  } catch {
    // localStorage indisponível (modo privado restrito): nada a limpar
  }
}

/**
 * Usuário logado, guardado só como cache para a interface (nome, papel). Quem prova a sessão é o cookie
 * `sw_sessao`; se ele expirar, o primeiro 401 de `apiFetch` limpa este cache.
 */
export function getStoredUser(): UsuarioSessao | null {
  if (typeof window === "undefined") return null;
  removerTokenLegado();
  const raw = localStorage.getItem(CHAVE_USUARIO);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function salvarUsuario(user: UsuarioSessao) {
  removerTokenLegado();
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(user));
}

export function limparUsuario() {
  removerTokenLegado();
  localStorage.removeItem(CHAVE_USUARIO);
}

/**
 * Path without `/api` prefix, e.g. `/turmas`. Sends the session cookie (`credentials: "include"`);
 * the token is never read by the frontend.
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  // Sessão expirada ou inválida: limpa o cache do usuário para a página mandar ao login
  if (res.status === 401 && typeof window !== "undefined") {
    limparUsuario();
  }
  return res;
}

/**
 * Confere a sessão no servidor (`GET /auth/me`) e atualiza o cache. `null` = não está logado (401).
 * Outro erro do servidor mantém o cache (não desloga por uma falha passageira); erro de rede lança.
 */
export async function validarSessao(): Promise<UsuarioSessao | null> {
  const res = await apiFetch("/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) return getStoredUser();
  const { user } = (await res.json()) as { user: UsuarioSessao };
  salvarUsuario(user);
  return user;
}

/** Apaga o cookie no servidor e o cache local. */
export async function sair() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // Sem rede: o cache local sai mesmo assim
  }
  limparUsuario();
}
