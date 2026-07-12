-- Soft delete para os módulos hospitalares
-- AlterTable
ALTER TABLE "public"."Plantao" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Supply" ADD COLUMN "deletedAt" TIMESTAMP(3);
