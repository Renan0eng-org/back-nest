-- Deduplicate slugs: keep the lowest-id row for each slug, delete the rest
DELETE FROM "public"."Menu_Acesso"
WHERE "idMenuAcesso" NOT IN (
  SELECT MIN("idMenuAcesso") FROM "public"."Menu_Acesso" GROUP BY "slug"
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."Nivel_Menu_Permissao" (
    "id" SERIAL NOT NULL,
    "nivelAcessoId" INTEGER NOT NULL,
    "menuAcessoId" INTEGER NOT NULL,
    "visualizar" BOOLEAN NOT NULL DEFAULT false,
    "criar" BOOLEAN NOT NULL DEFAULT false,
    "editar" BOOLEAN NOT NULL DEFAULT false,
    "excluir" BOOLEAN NOT NULL DEFAULT false,
    "relatorio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Nivel_Menu_Permissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Nivel_Menu_Permissao_nivelAcessoId_idx" ON "public"."Nivel_Menu_Permissao"("nivelAcessoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Nivel_Menu_Permissao_menuAcessoId_idx" ON "public"."Nivel_Menu_Permissao"("menuAcessoId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Nivel_Menu_Permissao_nivelAcessoId_menuAcessoId_key" ON "public"."Nivel_Menu_Permissao"("nivelAcessoId", "menuAcessoId");

-- CreateIndex (slug unique - safe now that duplicates are removed)
CREATE UNIQUE INDEX "Menu_Acesso_slug_key" ON "public"."Menu_Acesso"("slug");

-- AddForeignKey
ALTER TABLE "public"."Nivel_Menu_Permissao" ADD CONSTRAINT "Nivel_Menu_Permissao_nivelAcessoId_fkey" FOREIGN KEY ("nivelAcessoId") REFERENCES "public"."Nivel_Acesso"("idNivelAcesso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Nivel_Menu_Permissao" ADD CONSTRAINT "Nivel_Menu_Permissao_menuAcessoId_fkey" FOREIGN KEY ("menuAcessoId") REFERENCES "public"."Menu_Acesso"("idMenuAcesso") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: copy existing implicit many-to-many + Menu_Acesso permission flags into junction table
INSERT INTO "public"."Nivel_Menu_Permissao" ("nivelAcessoId", "menuAcessoId", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT j."B", j."A", m."visualizar", m."criar", m."editar", m."excluir", m."relatorio"
FROM "public"."_Menu_AcessoToNivel_Acesso" j
JOIN "public"."Menu_Acesso" m ON m."idMenuAcesso" = j."A"
ON CONFLICT ("nivelAcessoId", "menuAcessoId") DO NOTHING;
