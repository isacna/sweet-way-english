import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

/** Cria um PrismaClient para uma URL de Postgres (usado também pelos scripts e pelos testes com banco real). */
export function criarPrisma(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const url = process.env.DATABASE_URL;
if (!url && process.env.NODE_ENV !== 'test') {
  // Não derruba o import (os testes unitários mocam este módulo), mas avisa cedo.
  console.warn('[database] DATABASE_URL não definida; as consultas vão falhar.');
}

export const prisma = criarPrisma(url ?? 'postgresql://localhost:5432/sweetway');
