-- CreateEnum
CREATE TYPE "public"."PlantaoEventType" AS ENUM ('Criado', 'Atribuido', 'Pegou', 'Devolvido', 'Editado', 'CheckIn', 'CheckOut', 'Removido', 'Restaurado');

-- CreateTable
CREATE TABLE "public"."PlantaoEvent" (
    "id" TEXT NOT NULL,
    "plantaoId" TEXT NOT NULL,
    "type" "public"."PlantaoEventType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantaoEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantaoEvent_plantaoId_idx" ON "public"."PlantaoEvent"("plantaoId");

-- AddForeignKey
ALTER TABLE "public"."PlantaoEvent" ADD CONSTRAINT "PlantaoEvent_plantaoId_fkey" FOREIGN KEY ("plantaoId") REFERENCES "public"."Plantao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantaoEvent" ADD CONSTRAINT "PlantaoEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
