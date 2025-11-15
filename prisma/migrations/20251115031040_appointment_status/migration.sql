/*
  Warnings:

  - The values [PENDING,CONFIRMED,CANCELLED,COMPLETED] on the enum `AppointmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `userId` on table `Response` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AppointmentStatus_new" AS ENUM ('Pendente', 'Confirmado', 'Cancelado', 'Completo');
ALTER TABLE "public"."Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Appointment" ALTER COLUMN "status" TYPE "public"."AppointmentStatus_new" USING ("status"::text::"public"."AppointmentStatus_new");
ALTER TYPE "public"."AppointmentStatus" RENAME TO "AppointmentStatus_old";
ALTER TYPE "public"."AppointmentStatus_new" RENAME TO "AppointmentStatus";
DROP TYPE "public"."AppointmentStatus_old";
ALTER TABLE "public"."Appointment" ALTER COLUMN "status" SET DEFAULT 'Pendente';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Response" DROP CONSTRAINT "Response_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Appointment" ALTER COLUMN "status" SET DEFAULT 'Pendente';

-- AlterTable
ALTER TABLE "public"."Response" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;
