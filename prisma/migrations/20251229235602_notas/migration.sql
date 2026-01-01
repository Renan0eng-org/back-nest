-- CreateTable
CREATE TABLE "public"."MedicalNote" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'simple',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalNote_attendanceId_idx" ON "public"."MedicalNote"("attendanceId");

-- CreateIndex
CREATE INDEX "MedicalNote_attendanceId_order_idx" ON "public"."MedicalNote"("attendanceId", "order");

-- AddForeignKey
ALTER TABLE "public"."MedicalNote" ADD CONSTRAINT "MedicalNote_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
