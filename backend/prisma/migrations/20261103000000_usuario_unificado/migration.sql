-- Unifica "Professor" e "Aluno" em "Usuario", preservando os dados.
-- Professores mantêm o id; alunos recebem id + (maior id de professor) para não colidir.
-- O professor mais antigo vira admin (antes, todo professor tinha acesso de admin).
-- Se o mesmo e-mail existir nas duas tabelas, o índice único de "Usuario"
-- interrompe a migração: resolva o e-mail duplicado e rode de novo.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "dataNascimento" DATETIME,
    "responsavelNome" TEXT,
    "responsavelEmail" TEXT,
    "consentimentoResponsavelEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- Copia professores (mesmo id)
INSERT INTO "Usuario" ("id", "nome", "email", "senha", "papel", "admin", "criadoEm")
SELECT "id", "nome", "email", "senha", 'professor',
       CASE WHEN "id" = (SELECT MIN("id") FROM "Professor") THEN true ELSE false END,
       "criadoEm"
FROM "Professor";

-- Mapa de ids antigos de aluno -> novos ids de usuário
CREATE TEMP TABLE "_MapaAluno" ("antigo" INTEGER NOT NULL PRIMARY KEY, "novo" INTEGER NOT NULL);
INSERT INTO "_MapaAluno" ("antigo", "novo")
SELECT "id", "id" + COALESCE((SELECT MAX("id") FROM "Professor"), 0) FROM "Aluno";

INSERT INTO "Usuario" ("id", "nome", "email", "senha", "papel", "admin", "criadoEm")
SELECT m."novo", a."nome", a."email", a."senha", 'aluno', false, a."criadoEm"
FROM "Aluno" a JOIN "_MapaAluno" m ON m."antigo" = a."id";

-- RedefineTables (FKs passam a apontar para "Usuario")
CREATE TABLE "new_Feedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submissaoId" INTEGER NOT NULL,
    "professorId" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "nota" REAL NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_submissaoId_fkey" FOREIGN KEY ("submissaoId") REFERENCES "Submissao" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Feedback_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("comentario", "criadoEm", "id", "nota", "professorId", "submissaoId") SELECT "comentario", "criadoEm", "id", "nota", "professorId", "submissaoId" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
CREATE UNIQUE INDEX "Feedback_submissaoId_key" ON "Feedback"("submissaoId");

CREATE TABLE "new_Matricula" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alunoId" INTEGER NOT NULL,
    "turmaId" INTEGER NOT NULL,
    "dataMatricula" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    CONSTRAINT "Matricula_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Matricula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Matricula" ("alunoId", "dataMatricula", "id", "status", "turmaId")
SELECT m."novo", x."dataMatricula", x."id", x."status", x."turmaId"
FROM "Matricula" x JOIN "_MapaAluno" m ON m."antigo" = x."alunoId";
DROP TABLE "Matricula";
ALTER TABLE "new_Matricula" RENAME TO "Matricula";
CREATE UNIQUE INDEX "Matricula_alunoId_turmaId_key" ON "Matricula"("alunoId", "turmaId");

CREATE TABLE "new_Submissao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "atividadeId" INTEGER NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "conteudo" TEXT,
    "arquivoUrl" TEXT,
    "dataEnvio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    CONSTRAINT "Submissao_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Submissao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Submissao" ("alunoId", "arquivoUrl", "atividadeId", "conteudo", "dataEnvio", "id", "status")
SELECT m."novo", x."arquivoUrl", x."atividadeId", x."conteudo", x."dataEnvio", x."id", x."status"
FROM "Submissao" x JOIN "_MapaAluno" m ON m."antigo" = x."alunoId";
DROP TABLE "Submissao";
ALTER TABLE "new_Submissao" RENAME TO "Submissao";

CREATE TABLE "new_Turma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "codigoConvite" TEXT NOT NULL,
    "professorId" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Turma_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Turma" ("codigoConvite", "criadoEm", "descricao", "id", "nome", "professorId") SELECT "codigoConvite", "criadoEm", "descricao", "id", "nome", "professorId" FROM "Turma";
DROP TABLE "Turma";
ALTER TABLE "new_Turma" RENAME TO "Turma";
CREATE UNIQUE INDEX "Turma_codigoConvite_key" ON "Turma"("codigoConvite");

-- Tabelas antigas
DROP TABLE "_MapaAluno";
DROP INDEX "Aluno_email_key";
DROP INDEX "Professor_email_key";
DROP TABLE "Aluno";
DROP TABLE "Professor";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
