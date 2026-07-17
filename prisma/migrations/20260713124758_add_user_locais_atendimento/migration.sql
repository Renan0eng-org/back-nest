-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "locaisAtendimento" TEXT[] DEFAULT ARRAY[]::TEXT[];
