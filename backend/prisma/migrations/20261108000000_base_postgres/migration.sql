-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('aluno', 'professor');

-- CreateEnum
CREATE TYPE "StatusMatricula" AS ENUM ('ativa', 'inativa');

-- CreateEnum
CREATE TYPE "StatusSubmissao" AS ENUM ('pendente', 'aprovado', 'reprovado', 'corrigido');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('pdf', 'audio', 'video', 'link');

-- CreateEnum
CREATE TYPE "StatusConteudo" AS ENUM ('rascunho', 'revisao', 'publicado');

-- CreateEnum
CREATE TYPE "EtapaExercicio" AS ENUM ('controlada', 'semicontrolada', 'producao', 'quiz');

-- CreateEnum
CREATE TYPE "TipoExercicio" AS ENUM ('mcq', 'cloze', 'word_order', 'match', 'translate', 'error_correction');

-- CreateEnum
CREATE TYPE "HabilidadeTeste" AS ENUM ('gramatica_vocabulario', 'leitura', 'escrita');

-- CreateEnum
CREATE TYPE "Metodologia" AS ENUM ('gramatica', 'comunicativa', 'gamificada', 'input');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "dataNascimento" TIMESTAMP(3),
    "responsavelNome" TEXT,
    "responsavelEmail" TEXT,
    "consentimentoResponsavelEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "codigoConvite" TEXT NOT NULL,
    "professorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT,
    "link" TEXT,
    "turmaId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "turmaId" INTEGER NOT NULL,
    "dataMatricula" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusMatricula" NOT NULL DEFAULT 'ativa',

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atividade" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataEntrega" TIMESTAMP(3) NOT NULL,
    "arquivoObrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "turmaId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submissao" (
    "id" SERIAL NOT NULL,
    "atividadeId" INTEGER NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "conteudo" TEXT,
    "arquivoUrl" TEXT,
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusSubmissao" NOT NULL DEFAULT 'pendente',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "submissaoId" INTEGER NOT NULL,
    "professorId" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "nota" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoApp" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "logoUrl" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialApoio" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL,
    "urlArquivo" TEXT NOT NULL,
    "turmaId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialApoio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nivel" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nivel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" SERIAL NOT NULL,
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
    "status" "StatusConteudo" NOT NULL DEFAULT 'revisao',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licao" (
    "id" SERIAL NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "minutosEstimados" INTEGER NOT NULL,
    "apresentacao" JSONB NOT NULL,
    "status" "StatusConteudo" NOT NULL DEFAULT 'revisao',
    "revisadoPorId" INTEGER,
    "revisadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercicio" (
    "id" SERIAL NOT NULL,
    "licaoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "etapa" "EtapaExercicio" NOT NULL,
    "tipo" "TipoExercicio" NOT NULL,
    "enunciado" TEXT NOT NULL,
    "conteudo" JSONB NOT NULL,
    "gabarito" JSONB NOT NULL,
    "explicacao" TEXT NOT NULL,
    "tagsErro" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTeste" (
    "id" SERIAL NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "forma" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "habilidade" "HabilidadeTeste" NOT NULL,
    "tipo" "TipoExercicio" NOT NULL,
    "enunciado" TEXT NOT NULL,
    "conteudo" JSONB NOT NULL,
    "gabarito" JSONB NOT NULL,
    "explicacao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemTeste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilAprendiz" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "metodologia" "Metodologia" NOT NULL DEFAULT 'gramatica',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "ofensivaAtual" INTEGER NOT NULL DEFAULT 0,
    "ofensivaMaxima" INTEGER NOT NULL DEFAULT 0,
    "ultimoEstudoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilAprendiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressoLicao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "licaoId" INTEGER NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "melhorPercentual" INTEGER NOT NULL DEFAULT 0,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "concluidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressoLicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaLicao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "licaoId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotaLicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisaoItem" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "exercicioId" INTEGER NOT NULL,
    "caixa" INTEGER NOT NULL DEFAULT 1,
    "proximaEm" TIMESTAMP(3) NOT NULL,
    "acertos" INTEGER NOT NULL DEFAULT 0,
    "erros" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisaoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativaTeste" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "forma" INTEGER NOT NULL,
    "itemIds" JSONB NOT NULL,
    "respostas" JSONB,
    "percentual" INTEGER,
    "porHabilidade" JSONB,
    "aprovado" BOOLEAN,
    "iniciadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEm" TIMESTAMP(3),

    CONSTRAINT "TentativaTeste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Turma_codigoConvite_key" ON "Turma"("codigoConvite");

-- CreateIndex
CREATE INDEX "Turma_professorId_idx" ON "Turma"("professorId");

-- CreateIndex
CREATE INDEX "Aviso_turmaId_idx" ON "Aviso"("turmaId");

-- CreateIndex
CREATE INDEX "Matricula_turmaId_idx" ON "Matricula"("turmaId");

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_alunoId_turmaId_key" ON "Matricula"("alunoId", "turmaId");

-- CreateIndex
CREATE INDEX "Atividade_turmaId_idx" ON "Atividade"("turmaId");

-- CreateIndex
CREATE INDEX "Submissao_atividadeId_idx" ON "Submissao"("atividadeId");

-- CreateIndex
CREATE INDEX "Submissao_alunoId_idx" ON "Submissao"("alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_submissaoId_key" ON "Feedback"("submissaoId");

-- CreateIndex
CREATE INDEX "Feedback_professorId_idx" ON "Feedback"("professorId");

-- CreateIndex
CREATE INDEX "MaterialApoio_turmaId_idx" ON "MaterialApoio"("turmaId");

-- CreateIndex
CREATE UNIQUE INDEX "Nivel_codigo_key" ON "Nivel"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_slug_key" ON "Modulo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_nivelId_ordem_key" ON "Modulo"("nivelId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "Licao_slug_key" ON "Licao"("slug");

-- CreateIndex
CREATE INDEX "Licao_revisadoPorId_idx" ON "Licao"("revisadoPorId");

-- CreateIndex
CREATE UNIQUE INDEX "Licao_moduloId_ordem_key" ON "Licao"("moduloId", "ordem");

-- CreateIndex
CREATE INDEX "Exercicio_licaoId_idx" ON "Exercicio"("licaoId");

-- CreateIndex
CREATE INDEX "ItemTeste_moduloId_idx" ON "ItemTeste"("moduloId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilAprendiz_usuarioId_key" ON "PerfilAprendiz"("usuarioId");

-- CreateIndex
CREATE INDEX "ProgressoLicao_licaoId_idx" ON "ProgressoLicao"("licaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoLicao_usuarioId_licaoId_key" ON "ProgressoLicao"("usuarioId", "licaoId");

-- CreateIndex
CREATE INDEX "NotaLicao_licaoId_idx" ON "NotaLicao"("licaoId");

-- CreateIndex
CREATE UNIQUE INDEX "NotaLicao_usuarioId_licaoId_key" ON "NotaLicao"("usuarioId", "licaoId");

-- CreateIndex
CREATE INDEX "RevisaoItem_usuarioId_proximaEm_idx" ON "RevisaoItem"("usuarioId", "proximaEm");

-- CreateIndex
CREATE INDEX "RevisaoItem_exercicioId_idx" ON "RevisaoItem"("exercicioId");

-- CreateIndex
CREATE UNIQUE INDEX "RevisaoItem_usuarioId_exercicioId_key" ON "RevisaoItem"("usuarioId", "exercicioId");

-- CreateIndex
CREATE INDEX "TentativaTeste_usuarioId_moduloId_idx" ON "TentativaTeste"("usuarioId", "moduloId");

-- CreateIndex
CREATE INDEX "TentativaTeste_moduloId_idx" ON "TentativaTeste"("moduloId");

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissao" ADD CONSTRAINT "Submissao_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissao" ADD CONSTRAINT "Submissao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_submissaoId_fkey" FOREIGN KEY ("submissaoId") REFERENCES "Submissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialApoio" ADD CONSTRAINT "MaterialApoio_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modulo" ADD CONSTRAINT "Modulo_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Nivel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licao" ADD CONSTRAINT "Licao_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licao" ADD CONSTRAINT "Licao_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercicio" ADD CONSTRAINT "Exercicio_licaoId_fkey" FOREIGN KEY ("licaoId") REFERENCES "Licao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTeste" ADD CONSTRAINT "ItemTeste_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilAprendiz" ADD CONSTRAINT "PerfilAprendiz_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressoLicao" ADD CONSTRAINT "ProgressoLicao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressoLicao" ADD CONSTRAINT "ProgressoLicao_licaoId_fkey" FOREIGN KEY ("licaoId") REFERENCES "Licao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaLicao" ADD CONSTRAINT "NotaLicao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaLicao" ADD CONSTRAINT "NotaLicao_licaoId_fkey" FOREIGN KEY ("licaoId") REFERENCES "Licao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisaoItem" ADD CONSTRAINT "RevisaoItem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisaoItem" ADD CONSTRAINT "RevisaoItem_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "Exercicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativaTeste" ADD CONSTRAINT "TentativaTeste_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativaTeste" ADD CONSTRAINT "TentativaTeste_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
