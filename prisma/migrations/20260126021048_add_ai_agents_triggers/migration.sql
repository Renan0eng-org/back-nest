-- CreateTable
CREATE TABLE "public"."AiAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "systemPrompt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiTrigger" (
    "id" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minScore" INTEGER NOT NULL DEFAULT 5,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canStack" BOOLEAN NOT NULL DEFAULT false,
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "markers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiTriggerKeyword" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 5,
    "triggerId" TEXT NOT NULL,

    CONSTRAINT "AiTriggerKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiAgent_name_key" ON "public"."AiAgent"("name");

-- CreateIndex
CREATE INDEX "AiAgent_active_idx" ON "public"."AiAgent"("active");

-- CreateIndex
CREATE INDEX "AiAgent_isDefault_idx" ON "public"."AiAgent"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "AiTrigger_triggerId_key" ON "public"."AiTrigger"("triggerId");

-- CreateIndex
CREATE INDEX "AiTrigger_agentId_idx" ON "public"."AiTrigger"("agentId");

-- CreateIndex
CREATE INDEX "AiTrigger_active_idx" ON "public"."AiTrigger"("active");

-- CreateIndex
CREATE INDEX "AiTrigger_priority_idx" ON "public"."AiTrigger"("priority");

-- CreateIndex
CREATE INDEX "AiTriggerKeyword_triggerId_idx" ON "public"."AiTriggerKeyword"("triggerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiTriggerKeyword_triggerId_word_key" ON "public"."AiTriggerKeyword"("triggerId", "word");

-- AddForeignKey
ALTER TABLE "public"."AiTrigger" ADD CONSTRAINT "AiTrigger_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiTriggerKeyword" ADD CONSTRAINT "AiTriggerKeyword_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "public"."AiTrigger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
