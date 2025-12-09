-- AlterTable
ALTER TABLE "public"."Response" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "classification" TEXT,
ADD COLUMN     "conduct" TEXT,
ADD COLUMN     "totalScore" INTEGER;

-- CreateTable
CREATE TABLE "public"."ScoreRule" (
    "idScoreRule" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "classification" TEXT NOT NULL,
    "conduct" TEXT NOT NULL,
    "targetUserId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "formId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreRule_pkey" PRIMARY KEY ("idScoreRule")
);

-- CreateIndex
CREATE INDEX "ScoreRule_formId_idx" ON "public"."ScoreRule"("formId");

-- CreateIndex
CREATE INDEX "ScoreRule_minScore_maxScore_idx" ON "public"."ScoreRule"("minScore", "maxScore");

-- CreateIndex
CREATE INDEX "Response_assignedToId_idx" ON "public"."Response"("assignedToId");

-- AddForeignKey
ALTER TABLE "public"."ScoreRule" ADD CONSTRAINT "ScoreRule_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("idForm") ON DELETE CASCADE ON UPDATE CASCADE;
