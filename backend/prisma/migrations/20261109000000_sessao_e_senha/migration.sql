-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "versaoToken" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TokenSenha" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "hashToken" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenSenha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenSenha_hashToken_key" ON "TokenSenha"("hashToken");

-- CreateIndex
CREATE INDEX "TokenSenha_usuarioId_idx" ON "TokenSenha"("usuarioId");

-- AddForeignKey
ALTER TABLE "TokenSenha" ADD CONSTRAINT "TokenSenha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
