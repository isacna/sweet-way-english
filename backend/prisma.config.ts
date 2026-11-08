import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // PostgreSQL, ex.: postgresql://sweetway:senha@localhost:5432/sweetway
    // (`prisma generate` não conecta, então o valor padrão só serve para gerar o client sem .env)
    url: process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/sweetway",
  },
});
