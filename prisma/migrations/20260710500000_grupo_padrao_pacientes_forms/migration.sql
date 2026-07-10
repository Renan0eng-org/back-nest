-- Grupo: flag de grupo padrão
ALTER TABLE "public"."Grupo" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Paciente pertence a um grupo (escopo de visualização)
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "grupoPacienteId" INTEGER;

-- Formulário pertence a um grupo
ALTER TABLE "public"."Form" ADD COLUMN IF NOT EXISTS "grupoId" INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS "Grupo_isDefault_idx" ON "public"."Grupo"("isDefault");
CREATE INDEX IF NOT EXISTS "Form_grupoId_idx" ON "public"."Form"("grupoId");

-- Foreign keys (guarded)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_grupoPacienteId_fkey') THEN
        ALTER TABLE "public"."User" ADD CONSTRAINT "User_grupoPacienteId_fkey"
            FOREIGN KEY ("grupoPacienteId") REFERENCES "public"."Grupo"("idGrupo") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Form_grupoId_fkey') THEN
        ALTER TABLE "public"."Form" ADD CONSTRAINT "Form_grupoId_fkey"
            FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("idGrupo") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
