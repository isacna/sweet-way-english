-- Aditiva: lembretes de estudo por e-mail (opt-in) e certificados de nível.
ALTER TABLE "PerfilAprendiz" ADD COLUMN "lembretesEmail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PerfilAprendiz" ADD COLUMN "ultimoLembreteEm" TIMESTAMP(3);

CREATE TABLE "Certificado" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nivelId" INTEGER NOT NULL,
    "nomeAluno" TEXT NOT NULL,
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Certificado_codigo_key" ON "Certificado"("codigo");
CREATE INDEX "Certificado_nivelId_idx" ON "Certificado"("nivelId");
CREATE UNIQUE INDEX "Certificado_usuarioId_nivelId_key" ON "Certificado"("usuarioId", "nivelId");

ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Nivel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
