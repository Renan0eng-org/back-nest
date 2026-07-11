-- AlterEnum
ALTER TYPE "public"."PlantaoStatus" ADD VALUE 'Aberto';

-- DropForeignKey
ALTER TABLE "public"."Plantao" DROP CONSTRAINT "Plantao_doctorId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Plantao" ADD CONSTRAINT "Plantao_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
