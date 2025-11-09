-- CreateTable
CREATE TABLE "public"."_FormAssignedUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FormAssignedUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FormAssignedUsers_B_index" ON "public"."_FormAssignedUsers"("B");

-- AddForeignKey
ALTER TABLE "public"."_FormAssignedUsers" ADD CONSTRAINT "_FormAssignedUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Form"("idForm") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FormAssignedUsers" ADD CONSTRAINT "_FormAssignedUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- Inser data for aacess levels 

