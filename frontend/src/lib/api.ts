export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

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
  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  return res;
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}
