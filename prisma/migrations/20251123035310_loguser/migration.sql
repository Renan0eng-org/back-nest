-- AddForeignKey
ALTER TABLE "public"."ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
