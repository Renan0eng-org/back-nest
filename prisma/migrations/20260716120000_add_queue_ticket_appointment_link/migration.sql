-- AlterTable
ALTER TABLE "public"."QueueTicket" ADD COLUMN     "appointmentId" TEXT;

-- CreateIndex
CREATE INDEX "QueueTicket_appointmentId_idx" ON "public"."QueueTicket"("appointmentId");

-- AddForeignKey
ALTER TABLE "public"."QueueTicket" ADD CONSTRAINT "QueueTicket_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
