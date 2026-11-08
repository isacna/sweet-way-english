-- Uploads privados (F2 de docs/plano-producao.md, seção 2).
-- Os arquivos passam a ter metadados na tabela "Arquivo" e só são servidos por GET /api/arquivos/:id.
-- Escrita à mão: além do esquema, leva os valores "/uploads/<arquivo>" existentes para linhas de "Arquivo".
-- Os arquivos no disco NÃO mudam de nome: o "caminho" das linhas migradas é o nome antigo dentro de uploads/.

-- 1. Tabela de metadados
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "donoId" INTEGER NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Arquivo_donoId_idx" ON "Arquivo"("donoId");

-- 2. Novas colunas (ainda sem FK, para a carga abaixo)
ALTER TABLE "Atividade" ADD COLUMN "arquivoId" TEXT;
ALTER TABLE "Submissao" ADD COLUMN "arquivoId" TEXT;
ALTER TABLE "MaterialApoio" ADD COLUMN "arquivoId" TEXT, ADD COLUMN "url" TEXT;
ALTER TABLE "ConfiguracaoApp" ADD COLUMN "logoCaminho" TEXT;

-- Tipo pela extensão: os arquivos antigos não tiveram o conteúdo conferido, e o tamanho fica 0 (desconhecido).
CREATE FUNCTION pg_temp.mime_por_nome(nome TEXT) RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE lower(substring(nome FROM '\.([A-Za-z0-9]+)$'))
    WHEN 'pdf'  THEN 'application/pdf'
    WHEN 'png'  THEN 'image/png'
    WHEN 'jpg'  THEN 'image/jpeg'
    WHEN 'jpeg' THEN 'image/jpeg'
    WHEN 'gif'  THEN 'image/gif'
    WHEN 'webp' THEN 'image/webp'
    WHEN 'bmp'  THEN 'image/bmp'
    WHEN 'mp3'  THEN 'audio/mpeg'
    WHEN 'wav'  THEN 'audio/wav'
    WHEN 'ogg'  THEN 'audio/ogg'
    WHEN 'm4a'  THEN 'audio/mp4'
    WHEN 'aac'  THEN 'audio/aac'
    WHEN 'mp4'  THEN 'video/mp4'
    WHEN 'webm' THEN 'video/webm'
    WHEN 'mov'  THEN 'video/quicktime'
    WHEN 'doc'  THEN 'application/msword'
    WHEN 'docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    WHEN 'ppt'  THEN 'application/vnd.ms-powerpoint'
    WHEN 'pptx' THEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    WHEN 'txt'  THEN 'text/plain'
    ELSE 'application/octet-stream'
  END
$$;

-- Só valores "/uploads/<nome>" sem barra nem ".." viram arquivo; o resto (a API nunca gerou) é descartado.
-- O nome original é o nome antigo sem o prefixo "<timestamp>-" que o multer colocava.

-- 3. Entregas: o dono é o aluno
UPDATE "Submissao" SET "arquivoId" = gen_random_uuid()::text
WHERE "arquivoUrl" ~ '^/uploads/[^/\\]+$' AND "arquivoUrl" NOT LIKE '%..%';

INSERT INTO "Arquivo" ("id", "donoId", "nomeOriginal", "caminho", "mime", "tamanho", "criadoEm")
SELECT s."arquivoId", s."alunoId",
       regexp_replace(substring(s."arquivoUrl" FROM 10), '^[0-9]+-', ''),
       substring(s."arquivoUrl" FROM 10),
       pg_temp.mime_por_nome(s."arquivoUrl"), 0, s."dataEnvio"
FROM "Submissao" s
WHERE s."arquivoId" IS NOT NULL;

-- 4. Materiais: o dono é a professora da turma; links externos vão para "url"
UPDATE "MaterialApoio" SET "arquivoId" = gen_random_uuid()::text
WHERE "urlArquivo" ~ '^/uploads/[^/\\]+$' AND "urlArquivo" NOT LIKE '%..%';

UPDATE "MaterialApoio" SET "url" = "urlArquivo" WHERE "arquivoId" IS NULL;

INSERT INTO "Arquivo" ("id", "donoId", "nomeOriginal", "caminho", "mime", "tamanho", "criadoEm")
SELECT m."arquivoId", t."professorId",
       regexp_replace(substring(m."urlArquivo" FROM 10), '^[0-9]+-', ''),
       substring(m."urlArquivo" FROM 10),
       pg_temp.mime_por_nome(m."urlArquivo"), 0, m."criadoEm"
FROM "MaterialApoio" m
JOIN "Turma" t ON t."id" = m."turmaId"
WHERE m."arquivoId" IS NOT NULL;

-- 5. Logo: guarda só o nome do arquivo (servido em público por GET /api/configuracoes/logo)
UPDATE "ConfiguracaoApp" SET "logoCaminho" = substring("logoUrl" FROM 10)
WHERE "logoUrl" ~ '^/uploads/[^/\\]+$' AND "logoUrl" NOT LIKE '%..%';

-- 6. Colunas antigas saem
ALTER TABLE "Submissao" DROP COLUMN "arquivoUrl";
ALTER TABLE "MaterialApoio" DROP COLUMN "urlArquivo";
ALTER TABLE "ConfiguracaoApp" DROP COLUMN "logoUrl";

-- 7. Restrições
CREATE UNIQUE INDEX "Atividade_arquivoId_key" ON "Atividade"("arquivoId");
CREATE UNIQUE INDEX "MaterialApoio_arquivoId_key" ON "MaterialApoio"("arquivoId");
CREATE UNIQUE INDEX "Submissao_arquivoId_key" ON "Submissao"("arquivoId");

ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "Arquivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Submissao" ADD CONSTRAINT "Submissao_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "Arquivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialApoio" ADD CONSTRAINT "MaterialApoio_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "Arquivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Material é link OU upload, nunca os dois nem nenhum. O schema Prisma não modela CHECK (não gera drift).
ALTER TABLE "MaterialApoio" ADD CONSTRAINT "MaterialApoio_url_ou_arquivo"
  CHECK (("url" IS NOT NULL) <> ("arquivoId" IS NOT NULL));
