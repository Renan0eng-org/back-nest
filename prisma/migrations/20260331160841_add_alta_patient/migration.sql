-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "alta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "altaAt" TIMESTAMP(3);
