-- CreateEnum
CREATE TYPE "public"."ChatLogType" AS ENUM ('TRIGGER_DETECTED', 'MARKER_PROCESSED', 'ACTION_SUCCESS', 'ACTION_ERROR', 'MESSAGE_SENT', 'MESSAGE_RECEIVED');

-- CreateEnum
CREATE TYPE "public"."DoctorStatus" AS ENUM ('Ativo', 'Afastado', 'Ferias', 'Inativo');

-- CreateEnum
CREATE TYPE "public"."PlantaoStatus" AS ENUM ('Agendado', 'EmAndamento', 'Concluido', 'Cancelado');

-- CreateEnum
CREATE TYPE "public"."QueuePriority" AS ENUM ('Normal', 'Preferencial', 'Urgencia');

-- CreateEnum
CREATE TYPE "public"."QueueStatus" AS ENUM ('Aguardando', 'Chamado', 'EmAtendimento', 'Concluido', 'Cancelado', 'Faltou');

-- CreateEnum
CREATE TYPE "public"."SupplyMovementType" AS ENUM ('Entrada', 'Saida');

-- CreateTable
CREATE TABLE "public"."ChatLog" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ChatLogType" NOT NULL,
    "triggerName" TEXT,
    "triggerId" TEXT,
    "score" DOUBLE PRECISION,
    "marker" TEXT,
    "actionResult" TEXT,
    "errorMessage" TEXT,
    "userMessage" TEXT,
    "aiResponse" TEXT,
    "metadata" JSONB,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Medico" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "crm" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "grupoId" INTEGER,
    "status" "public"."DoctorStatus" NOT NULL DEFAULT 'Ativo',
    "cargaHoraria" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Plantao" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "grupoId" INTEGER,
    "setor" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."PlantaoStatus" NOT NULL DEFAULT 'Agendado',
    "checkinAt" TIMESTAMP(3),
    "checkoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plantao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QueueTicket" (
    "id" TEXT NOT NULL,
    "grupoId" INTEGER,
    "code" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "setor" TEXT NOT NULL,
    "priority" "public"."QueuePriority" NOT NULL DEFAULT 'Normal',
    "status" "public"."QueueStatus" NOT NULL DEFAULT 'Aguardando',
    "doctorId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "QueueTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supply" (
    "id" TEXT NOT NULL,
    "grupoId" INTEGER,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "lot" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupplyMovement" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "type" "public"."SupplyMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "attendanceId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatLog_chatId_idx" ON "public"."ChatLog"("chatId");

-- CreateIndex
CREATE INDEX "ChatLog_userId_idx" ON "public"."ChatLog"("userId");

-- CreateIndex
CREATE INDEX "ChatLog_type_idx" ON "public"."ChatLog"("type");

-- CreateIndex
CREATE INDEX "ChatLog_triggerName_idx" ON "public"."ChatLog"("triggerName");

-- CreateIndex
CREATE INDEX "ChatLog_createdAt_idx" ON "public"."ChatLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Medico_userId_key" ON "public"."Medico"("userId");

-- CreateIndex
CREATE INDEX "Medico_grupoId_idx" ON "public"."Medico"("grupoId");

-- CreateIndex
CREATE INDEX "Medico_status_idx" ON "public"."Medico"("status");

-- CreateIndex
CREATE INDEX "Plantao_medicoId_idx" ON "public"."Plantao"("medicoId");

-- CreateIndex
CREATE INDEX "Plantao_grupoId_idx" ON "public"."Plantao"("grupoId");

-- CreateIndex
CREATE INDEX "Plantao_startsAt_idx" ON "public"."Plantao"("startsAt");

-- CreateIndex
CREATE INDEX "Plantao_status_idx" ON "public"."Plantao"("status");

-- CreateIndex
CREATE INDEX "QueueTicket_grupoId_idx" ON "public"."QueueTicket"("grupoId");

-- CreateIndex
CREATE INDEX "QueueTicket_status_idx" ON "public"."QueueTicket"("status");

-- CreateIndex
CREATE INDEX "QueueTicket_issuedAt_idx" ON "public"."QueueTicket"("issuedAt");

-- CreateIndex
CREATE INDEX "Supply_grupoId_idx" ON "public"."Supply"("grupoId");

-- CreateIndex
CREATE INDEX "SupplyMovement_supplyId_idx" ON "public"."SupplyMovement"("supplyId");

-- CreateIndex
CREATE INDEX "SupplyMovement_type_idx" ON "public"."SupplyMovement"("type");

-- CreateIndex
CREATE INDEX "SupplyMovement_createdAt_idx" ON "public"."SupplyMovement"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."ChatLog" ADD CONSTRAINT "ChatLog_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("idChat") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatLog" ADD CONSTRAINT "ChatLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Medico" ADD CONSTRAINT "Medico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Medico" ADD CONSTRAINT "Medico_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("idGrupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Plantao" ADD CONSTRAINT "Plantao_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "public"."Medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Plantao" ADD CONSTRAINT "Plantao_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("idGrupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QueueTicket" ADD CONSTRAINT "QueueTicket_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QueueTicket" ADD CONSTRAINT "QueueTicket_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QueueTicket" ADD CONSTRAINT "QueueTicket_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("idGrupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Supply" ADD CONSTRAINT "Supply_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "public"."Grupo"("idGrupo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplyMovement" ADD CONSTRAINT "SupplyMovement_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "public"."Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
