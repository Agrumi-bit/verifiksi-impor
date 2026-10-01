-- AlterTable
ALTER TABLE "partner" ADD COLUMN     "ownerCompanyId" TEXT;

-- CreateIndex
CREATE INDEX "partner_ownerCompanyId_idx" ON "partner"("ownerCompanyId");

-- AddForeignKey
ALTER TABLE "partner" ADD CONSTRAINT "partner_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
