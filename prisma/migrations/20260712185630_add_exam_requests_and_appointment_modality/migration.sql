-- CreateEnum
CREATE TYPE "public"."AppointmentModality" AS ENUM ('Presencial', 'Remoto');

-- CreateEnum
CREATE TYPE "public"."ExamRequestStatus" AS ENUM ('Pendente', 'Enviado', 'Avaliado', 'Cancelado');

-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "location" TEXT,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "modality" "public"."AppointmentModality" NOT NULL DEFAULT 'Presencial',
ADD COLUMN     "originAttendanceId" TEXT;

-- CreateTable
CREATE TABLE "public"."ExamRequest" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "requestedById" TEXT,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "status" "public"."ExamRequestStatus" NOT NULL DEFAULT 'Pendente',
    "resultUrl" VARCHAR(512),
    "resultFileName" TEXT,
    "resultType" TEXT,
    "resultAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamRequest_patientId_idx" ON "public"."ExamRequest"("patientId");

-- CreateIndex
CREATE INDEX "ExamRequest_appointmentId_idx" ON "public"."ExamRequest"("appointmentId");

-- CreateIndex
CREATE INDEX "ExamRequest_attendanceId_idx" ON "public"."ExamRequest"("attendanceId");

-- CreateIndex
CREATE INDEX "ExamRequest_status_idx" ON "public"."ExamRequest"("status");

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_originAttendanceId_fkey" FOREIGN KEY ("originAttendanceId") REFERENCES "public"."Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamRequest" ADD CONSTRAINT "ExamRequest_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "public"."Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamRequest" ADD CONSTRAINT "ExamRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamRequest" ADD CONSTRAINT "ExamRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamRequest" ADD CONSTRAINT "ExamRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
