-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Atividade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataEntrega" DATETIME NOT NULL,
    "arquivoObrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "turmaId" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Atividade_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Atividade" ("criadoEm", "dataEntrega", "descricao", "id", "titulo", "turmaId") SELECT "criadoEm", "dataEntrega", "descricao", "id", "titulo", "turmaId" FROM "Atividade";
DROP TABLE "Atividade";
ALTER TABLE "new_Atividade" RENAME TO "Atividade";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
