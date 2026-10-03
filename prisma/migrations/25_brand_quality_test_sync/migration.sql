-- AlterTable
ALTER TABLE "brand_quality_test" ADD COLUMN     "sourceApplicationId" TEXT,
ADD COLUMN     "sourceType" "MerkRelationshipSource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "brand_quality_test_sourceApplicationId_idx" ON "brand_quality_test"("sourceApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_quality_test_merkId_commodityGroupId_sourceApplicatio_key" ON "brand_quality_test"("merkId", "commodityGroupId", "sourceApplicationId");

-- AddForeignKey
ALTER TABLE "brand_quality_test" ADD CONSTRAINT "brand_quality_test_sourceApplicationId_fkey" FOREIGN KEY ("sourceApplicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
