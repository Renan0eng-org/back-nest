-- CreateEnum
CREATE TYPE "public"."Sex" AS ENUM ('FEMININO', 'MASCULINO', 'OUTRO');

-- AlterEnum
ALTER TYPE "public"."EnumUserType" ADD VALUE 'MEDICO';

-- AlterTable
ALTER TABLE "public"."Form" ADD COLUMN     "isScreening" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "alergias" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "exames" BOOLEAN DEFAULT false,
ADD COLUMN     "examesDetalhes" TEXT,
ADD COLUMN     "medicamentos" TEXT,
ADD COLUMN     "sexo" "public"."Sex",
ADD COLUMN     "unidadeSaude" TEXT;
