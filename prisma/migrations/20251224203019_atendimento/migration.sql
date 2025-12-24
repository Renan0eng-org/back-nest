-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('EmAndamento', 'Concluido', 'Cancelado');

-- CreateTable
CREATE TABLE "public"."Attendance" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "presentingIllness" TEXT,
    "medicalHistory" TEXT,
    "physicalExamination" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "bloodPressure" TEXT,
    "heartRate" INTEGER,
    "temperature" DECIMAL(5,2),
    "respiratoryRate" INTEGER,
    "status" "public"."AttendanceStatus" NOT NULL DEFAULT 'EmAndamento',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendancePrescription" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceAttachment" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" VARCHAR(512) NOT NULL,
    "fileType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendance_appointmentId_idx" ON "public"."Attendance"("appointmentId");

-- CreateIndex
CREATE INDEX "Attendance_patientId_idx" ON "public"."Attendance"("patientId");

-- CreateIndex
CREATE INDEX "Attendance_professionalId_idx" ON "public"."Attendance"("professionalId");

-- CreateIndex
CREATE INDEX "Attendance_attendanceDate_idx" ON "public"."Attendance"("attendanceDate");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "public"."Attendance"("status");

-- CreateIndex
CREATE INDEX "AttendancePrescription_attendanceId_idx" ON "public"."AttendancePrescription"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceAttachment_attendanceId_idx" ON "public"."AttendanceAttachment"("attendanceId");

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendancePrescription" ADD CONSTRAINT "AttendancePrescription_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceAttachment" ADD CONSTRAINT "AttendanceAttachment_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
