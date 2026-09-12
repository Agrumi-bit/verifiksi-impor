
-- CreateTable
CREATE TABLE "brand_document" (
    "id" TEXT NOT NULL,
    "merkId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "documentNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_quality_test" (
    "id" TEXT NOT NULL,
    "merkId" TEXT NOT NULL,
    "commodityGroupId" TEXT NOT NULL,
    "commoditySubGroupId" TEXT,
    "certificateNumber" TEXT NOT NULL,
    "laboratoryName" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_quality_test_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_document_merkId_idx" ON "brand_document"("merkId");

-- CreateIndex
CREATE INDEX "brand_document_merkId_documentType_idx" ON "brand_document"("merkId", "documentType");

-- CreateIndex
CREATE INDEX "brand_quality_test_merkId_idx" ON "brand_quality_test"("merkId");

-- CreateIndex
CREATE INDEX "brand_quality_test_commodityGroupId_idx" ON "brand_quality_test"("commodityGroupId");

-- CreateIndex
CREATE INDEX "brand_quality_test_commoditySubGroupId_idx" ON "brand_quality_test"("commoditySubGroupId");

-- AddForeignKey
ALTER TABLE "brand_document" ADD CONSTRAINT "brand_document_merkId_fkey" FOREIGN KEY ("merkId") REFERENCES "merk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_quality_test" ADD CONSTRAINT "brand_quality_test_merkId_fkey" FOREIGN KEY ("merkId") REFERENCES "merk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_quality_test" ADD CONSTRAINT "brand_quality_test_commodityGroupId_fkey" FOREIGN KEY ("commodityGroupId") REFERENCES "commodity_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_quality_test" ADD CONSTRAINT "brand_quality_test_commoditySubGroupId_fkey" FOREIGN KEY ("commoditySubGroupId") REFERENCES "commodity_sub_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

