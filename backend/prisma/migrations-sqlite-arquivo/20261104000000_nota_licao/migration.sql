-- CreateTable
CREATE TABLE "NotaLicao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "licaoId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "NotaLicao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotaLicao_licaoId_fkey" FOREIGN KEY ("licaoId") REFERENCES "Licao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NotaLicao_usuarioId_licaoId_key" ON "NotaLicao"("usuarioId", "licaoId");
