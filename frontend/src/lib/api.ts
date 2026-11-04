const API_PORTA = 3333;

/**
 * URL do backend. Com `NEXT_PUBLIC_API_URL` definida, usa ela; senão, usa o mesmo host
 * pelo qual a página foi aberta (localhost, IP da rede…) na porta 3333 — assim a troca
 * de IP do computador não exige editar o .env.
 */
export function apiUrl(): string {
  const configurada = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configurada) return configurada.replace(/\/$/, "");
  if (typeof window === "undefined") return `http://localhost:${API_PORTA}`;
  return `${window.location.protocol}//${window.location.hostname}:${API_PORTA}`;
}

/** Rotas REST do backend (`server.ts` monta em `/api`). Ver `backend/src/http/routes/index.ts`. */
export const apiPaths = {
  professorAlunos: "/professor/alunos",
  professorAluno: (id: number) => `/professor/alunos/${id}`,
  /** Feedbacks do aluno autenticado */
  alunoMeFeedbacks: "/alunos/me/feedbacks",
} as const;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getStoredUser(): {
  id: number;
  nome: string;
  email: string;
  role: string;
  admin?: boolean;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Path without `/api` prefix, e.g. `/turmas` */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${apiUrl()}/api${path}`, { ...init, headers });
  // Token expirado ou inválido: limpa a sessão para a página mandar ao login
  if (res.status === 401 && token) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
  return res;
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiUrl()}${path}`;
}
