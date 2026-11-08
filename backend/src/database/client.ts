import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

/** Cria um PrismaClient para uma URL de Postgres (usado também pelos scripts e pelos testes com banco real). */
export function criarPrisma(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Sem DATABASE_URL o import não falha (os testes unitários mocam este módulo); o servidor avisa na subida (server.ts).
export const prisma = criarPrisma(process.env.DATABASE_URL ?? 'postgresql://localhost:5432/sweetway');
