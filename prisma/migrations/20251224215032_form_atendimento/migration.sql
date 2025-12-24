-- CreateTable
CREATE TABLE "public"."AttendanceResponse" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_FormAssignedAttendances" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FormAssignedAttendances_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "AttendanceResponse_attendanceId_idx" ON "public"."AttendanceResponse"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceResponse_responseId_idx" ON "public"."AttendanceResponse"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceResponse_attendanceId_responseId_key" ON "public"."AttendanceResponse"("attendanceId", "responseId");

-- CreateIndex
CREATE INDEX "_FormAssignedAttendances_B_index" ON "public"."_FormAssignedAttendances"("B");

-- AddForeignKey
ALTER TABLE "public"."AttendanceResponse" ADD CONSTRAINT "AttendanceResponse_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceResponse" ADD CONSTRAINT "AttendanceResponse_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "public"."Response"("idResponse") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FormAssignedAttendances" ADD CONSTRAINT "_FormAssignedAttendances_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FormAssignedAttendances" ADD CONSTRAINT "_FormAssignedAttendances_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Form"("idForm") ON DELETE CASCADE ON UPDATE CASCADE;
