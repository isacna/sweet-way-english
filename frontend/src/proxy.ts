import { NextResponse, type NextRequest } from "next/server";

/**
 * Guarda de rotas (Next 16: `proxy.ts`, antigo `middleware.ts`). Roda antes de renderizar `/aluno/*` e `/professor/*`:
 * - sem o cookie `sw_sessao` (ou com o JWT já vencido) → `/login?tipo=aluno|professor`;
 * - aluno em `/professor/*` → `/aluno`; professor em `/aluno/*` → `/professor`.
 *
 * O JWT só é DECODIFICADO, não verificado: o frontend não tem o segredo. Isto só evita mostrar a tela errada;
 * quem garante o acesso é o backend, que confere assinatura, `versaoToken` e papel em toda chamada (e devolve 401/403,
 * que as páginas tratam mandando para o login).
 */

const COOKIE_SESSAO = "sw_sessao";

type Area = "aluno" | "professor";

function lerPayload(token: string): { role?: unknown; exp?: unknown } | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  try {
    const b64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    const payload: unknown = JSON.parse(json);
    return payload && typeof payload === "object" ? (payload as { role?: unknown; exp?: unknown }) : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area: Area = pathname.startsWith("/professor") ? "professor" : "aluno";

  const token = request.cookies.get(COOKIE_SESSAO)?.value;
  const payload = token ? lerPayload(token) : null;
  const vencido = typeof payload?.exp === "number" && payload.exp * 1000 <= Date.now();

  if (!payload || vencido) {
    const login = new URL("/login", request.url);
    login.searchParams.set("tipo", area);
    return NextResponse.redirect(login);
  }

  const papel = payload.role === "professor" ? "professor" : payload.role === "aluno" ? "aluno" : null;
  if (papel && papel !== area) {
    return NextResponse.redirect(new URL(`/${papel}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/aluno", "/aluno/:path*", "/professor", "/professor/:path*"],
};
