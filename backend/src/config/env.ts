import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET é obrigatório (defina no .env)' })
    .min(16, 'JWT_SECRET precisa ter pelo menos 16 caracteres'),
  // Também é o maxAge do cookie de sessão: use um número seguido de s, m, h, d ou w (ex.: 7d, 12h)
  JWT_EXPIRES_IN: z
    .string()
    .default('7d')
    .refine((v) => duracaoEmMs(v) !== null, 'JWT_EXPIRES_IN deve ser como 7d, 12h, 30m ou 3600 (segundos)'),
  PORT: z.coerce.number().int().positive().default(3333),
  APP_URL: z.string().default('http://localhost:3333'),
  // Origens permitidas no CORS, separadas por vírgula
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(10),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Atrás de proxy reverso (Caddy/Nginx): número de proxies confiáveis, para req.ip e o rate limit verem o IP real.
  // 0 = sem proxy (padrão em dev).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Cookie de sessão com a flag Secure (só HTTPS). Ligado sempre em produção; COOKIE_SECURE=1 liga fora dela.
  COOKIE_SECURE: z.enum(['0', '1', '']).optional(),
  // E-mail transacional (recuperar senha). Sem RESEND_API_KEY, as mensagens só aparecem no log (dev).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default('Sweet Way English <onboarding@resend.dev>'),
  // Endereço público do frontend, usado nos links enviados por e-mail
  FRONTEND_URL: z.url('FRONTEND_URL precisa ser uma URL (ex.: https://app.exemplo.com)').default('http://localhost:3000'),
});

/** Converte JWT_EXPIRES_IN (`7d`, `12h`, `30m`, `3600`) em milissegundos, para o maxAge do cookie. */
export function duracaoEmMs(valor: string): number | null {
  const m = /^(\d+)\s*(s|m|h|d|w)?$/.exec(valor.trim());
  if (!m) return null;
  const unidade = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[(m[2] ?? 's') as 's'];
  return Number(m[1]) * unidade * 1000;
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problemas = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${problemas}`);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  sessaoMaxAgeMs: duracaoEmMs(parsed.data.JWT_EXPIRES_IN)!,
  cookieSecure: parsed.data.NODE_ENV === 'production' || parsed.data.COOKIE_SECURE === '1',
  frontendUrl: parsed.data.FRONTEND_URL.replace(/\/+$/, ''),
};
