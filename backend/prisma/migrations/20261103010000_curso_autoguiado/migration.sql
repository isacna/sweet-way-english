
-- CreateTable
CREATE TABLE "Nivel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nivelId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "canDos" JSONB NOT NULL,
    "gramatica" TEXT NOT NULL,
    "vocabulario" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "pronuncia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'revisao',
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Modulo_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Nivel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Licao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moduloId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "minutosEstimados" INTEGER NOT NULL,
    "apresentacao" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'revisao',
    "revisadoPorId" INTEGER,
    "revisadoEm" DATETIME,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Licao_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exercicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "licaoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "etapa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "conteudo" JSONB NOT NULL,
    "gabarito" JSONB NOT NULL,
    "explicacao" TEXT NOT NULL,
    "tagsErro" JSONB,
    CONSTRAINT "Exercicio_licaoId_fkey" FOREIGN KEY ("licaoId") REFERENCES "Licao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemTeste" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moduloId" INTEGER NOT NULL,
    "forma" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "habilidade" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "conteudo" JSONB NOT NULL,
    "gabarito" JSONB NOT NULL,
    "explicacao" TEXT NOT NULL,
    CONSTRAINT "ItemTeste_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerfilAprendiz" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "metodologia" TEXT NOT NULL DEFAULT 'gramatica',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "ofensivaAtual" INTEGER NOT NULL DEFAULT 0,
    "ofensivaMaxima" INTEGER NOT NULL DEFAULT 0,
    "ultimoEstudoEm" DATETIME,
    CONSTRAINT "PerfilAprendiz_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressoLicao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "licaoId" INTEGER NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "melhorPercentual" INTEGER NOT NULL DEFAULT 0,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "concluidaEm" DATETIME,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "ProgressoLicao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressoLicao_licaoId_fkey" FOREIGN KEY ("licaoId") REFERENCES "Licao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevisaoItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "exercicioId" INTEGER NOT NULL,
    "caixa" INTEGER NOT NULL DEFAULT 1,
    "proximaEm" DATETIME NOT NULL,
    "acertos" INTEGER NOT NULL DEFAULT 0,
    "erros" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RevisaoItem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RevisaoItem_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "Exercicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TentativaTeste" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "forma" INTEGER NOT NULL,
    "itemIds" JSONB NOT NULL,
    "respostas" JSONB,
    "percentual" INTEGER,
    "porHabilidade" JSONB,
    "aprovado" BOOLEAN,
    "iniciadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEm" DATETIME,
    CONSTRAINT "TentativaTeste_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TentativaTeste_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Nivel_codigo_key" ON "Nivel"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_slug_key" ON "Modulo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_nivelId_ordem_key" ON "Modulo"("nivelId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "Licao_slug_key" ON "Licao"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Licao_moduloId_ordem_key" ON "Licao"("moduloId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilAprendiz_usuarioId_key" ON "PerfilAprendiz"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoLicao_usuarioId_licaoId_key" ON "ProgressoLicao"("usuarioId", "licaoId");

-- CreateIndex
CREATE INDEX "RevisaoItem_usuarioId_proximaEm_idx" ON "RevisaoItem"("usuarioId", "proximaEm");

-- CreateIndex
CREATE UNIQUE INDEX "RevisaoItem_usuarioId_exercicioId_key" ON "RevisaoItem"("usuarioId", "exercicioId");

-- CreateIndex
CREATE INDEX "TentativaTeste_usuarioId_moduloId_idx" ON "TentativaTeste"("usuarioId", "moduloId");

