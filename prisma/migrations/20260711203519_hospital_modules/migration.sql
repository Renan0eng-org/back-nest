/*
  Warnings:

  - You are about to drop the column `medicoId` on the `Plantao` table. All the data in the column will be lost.
  - You are about to drop the `Medico` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `doctorId` to the `Plantao` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Medico" DROP CONSTRAINT "Medico_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Medico" DROP CONSTRAINT "Medico_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Plantao" DROP CONSTRAINT "Plantao_medicoId_fkey";

-- DropIndex
DROP INDEX "public"."Plantao_medicoId_idx";

-- AlterTable
ALTER TABLE "public"."Plantao" DROP COLUMN "medicoId",
ADD COLUMN     "doctorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "cargaHoraria" INTEGER,
ADD COLUMN     "crm" TEXT,
ADD COLUMN     "especialidade" TEXT,
ADD COLUMN     "medicoStatus" "public"."DoctorStatus";

-- DropTable
DROP TABLE "public"."Medico";

-- CreateIndex
CREATE INDEX "Plantao_doctorId_idx" ON "public"."Plantao"("doctorId");

-- AddForeignKey
ALTER TABLE "public"."Plantao" ADD CONSTRAINT "Plantao_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;
