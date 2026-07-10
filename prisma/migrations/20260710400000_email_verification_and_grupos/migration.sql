-- Email verification fields on User
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Existing users are considered verified (they already use the system)
UPDATE "public"."User" SET "emailVerified" = true, "emailVerifiedAt" = NOW() WHERE "emailVerified" = false;

-- Form ownership
ALTER TABLE "public"."Form" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- CreateTable EmailVerificationToken
CREATE TABLE IF NOT EXISTS "public"."EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable Grupo
CREATE TABLE IF NOT EXISTS "public"."Grupo" (
    "idGrupo" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("idGrupo")
);

-- CreateTable Grupo_Membro
CREATE TABLE IF NOT EXISTS "public"."Grupo_Membro" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grupo_Membro_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_token_key" ON "public"."EmailVerificationToken"("token");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_token_idx" ON "public"."EmailVerificationToken"("token");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "public"."EmailVerificationToken"("userId");
CREATE INDEX IF NOT EXISTS "Grupo_createdById_idx" ON "public"."Grupo"("createdById");
CREATE UNIQUE INDEX IF NOT EXISTS "Grupo_Membro_grupoId_userId_key" ON "public"."Grupo_Membro"("grupoId", "userId");
CREATE INDEX IF NOT EXISTS "Grupo_Membro_grupoId_idx" ON "public"."Grupo_Membro"("grupoId");
CREATE INDEX IF NOT EXISTS "Grupo_Membro_userId_idx" ON "public"."Grupo_Membro"("userId");
CREATE INDEX IF NOT EXISTS "Form_createdById_idx" ON "public"."Form"("createdById");

-- Foreign keys (guarded: Postgres has no IF NOT EXISTS for constraints)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailVerificationToken_userId_fkey') THEN
        ALTER TABLE "public"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grupo_createdById_fkey') THEN
        ALTER TABLE "public"."Grupo" ADD CONSTRAINT "Grupo_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grupo_Membro_grupoId_fkey') THEN
        ALTER TABLE "public"."Grupo_Membro" ADD CONSTRAINT "Grupo_Membro_grupoId_fkey"
            FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("idGrupo") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grupo_Membro_userId_fkey') THEN
        ALTER TABLE "public"."Grupo_Membro" ADD CONSTRAINT "Grupo_Membro_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Form_createdById_fkey') THEN
        ALTER TABLE "public"."Form" ADD CONSTRAINT "Form_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
