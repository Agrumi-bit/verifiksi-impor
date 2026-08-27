-- CreateTable
CREATE TABLE "_PartnerRelatedCompanies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PartnerRelatedCompanies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PartnerRelatedCompanies_B_index" ON "_PartnerRelatedCompanies"("B");

-- CreateIndex
CREATE UNIQUE INDEX "company_nibNumber_key" ON "company"("nibNumber");

-- AddForeignKey
ALTER TABLE "_PartnerRelatedCompanies" ADD CONSTRAINT "_PartnerRelatedCompanies_A_fkey" FOREIGN KEY ("A") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PartnerRelatedCompanies" ADD CONSTRAINT "_PartnerRelatedCompanies_B_fkey" FOREIGN KEY ("B") REFERENCES "partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
