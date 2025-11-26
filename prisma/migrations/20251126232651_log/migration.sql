-- AlterTable
ALTER TABLE "public"."ErrorLog" ADD COLUMN     "forwardedFor" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "userAgent" TEXT;
