-- AlterTable
ALTER TABLE "public"."Plantao" ALTER COLUMN "status" SET DEFAULT 'Aberto',
ALTER COLUMN "doctorId" DROP NOT NULL;