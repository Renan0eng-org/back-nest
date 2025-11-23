-- CreateTable
CREATE TABLE "public"."ErrorLog" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "method" TEXT,
    "route" TEXT,
    "statusCode" INTEGER,
    "userId" TEXT,
    "userEmail" TEXT,
    "file" TEXT,
    "line" INTEGER,
    "column" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "public"."ErrorLog"("createdAt");
