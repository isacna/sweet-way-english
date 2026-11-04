import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET é obrigatório (defina no .env)' })
    .min(16, 'JWT_SECRET precisa ter pelo menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().int().positive().default(3333),
  APP_URL: z.string().default('http://localhost:3333'),
  // Origens permitidas no CORS, separadas por vírgula
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problemas = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Variáveis de ambiente inválidas:\n${problemas}`);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
