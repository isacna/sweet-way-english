-- Aditiva: meta diária de XP e boas-vindas do aluno. Preserva o progresso existente.
ALTER TABLE "PerfilAprendiz" ADD COLUMN "metaDiariaXp" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "PerfilAprendiz" ADD COLUMN "xpDoDia" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PerfilAprendiz" ADD COLUMN "onboardingEm" TIMESTAMP(3);

-- Quem já estudou não vê as boas-vindas.
UPDATE "PerfilAprendiz" SET "onboardingEm" = CURRENT_TIMESTAMP WHERE "ultimoEstudoEm" IS NOT NULL;
