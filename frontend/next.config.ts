import type { NextConfig } from "next";

/**
 * Backend para onde o Next repassa `/api/*` (só no servidor; o navegador sempre chama `/api` relativo).
 * Atenção: os `rewrites` são resolvidos no `next build` (vão para o routes-manifest), então mudar `BACKEND_URL`
 * exige um build novo — no Docker ele é um build arg. Em produção o Caddy manda `/api/*` direto ao backend e este
 * rewrite fica só como reserva.
 */
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:3333").replace(/\/$/, "");

/** Hosts extras que podem abrir o `next dev` (ex.: o IP do computador na rede, para testar no celular). */
const origensDev = (process.env.ALLOWED_DEV_ORIGINS ?? "10.0.50.175,192.168.18.200")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost", "127.0.0.1", ...origensDev],
  experimental: {
    // O Next copia o corpo de toda requisição (por causa do proxy.ts) e corta o que passar deste limite (10 MB por
    // padrão) — inclusive no repasse do rewrite. Uploads vão até UPLOAD_MAX_MB (10 MB) + a sobra do multipart.
    proxyClientMaxBodySize: "25mb",
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
