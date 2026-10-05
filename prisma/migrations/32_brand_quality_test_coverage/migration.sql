-- CreateTable
CREATE TABLE "brand_quality_test_coverage" (
    "id" TEXT NOT NULL,
    "qualityTestId" TEXT NOT NULL,
    "commodityGroupId" TEXT NOT NULL,
    "sourceApplicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_quality_test_coverage_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "brand_quality_test_coverage_commodityGroupId_idx" ON "brand_quality_test_coverage"("commodityGroupId");
-- CreateIndex
CREATE INDEX "brand_quality_test_coverage_sourceApplicationId_idx" ON "brand_quality_test_coverage"("sourceApplicationId");
-- CreateIndex
CREATE UNIQUE INDEX "brand_quality_test_coverage_qualityTestId_commodityGroupId_key" ON "brand_quality_test_coverage"("qualityTestId", "commodityGroupId");
-- AddForeignKey
ALTER TABLE "brand_quality_test_coverage" ADD CONSTRAINT "brand_quality_test_coverage_qualityTestId_fkey" FOREIGN KEY ("qualityTestId") REFERENCES "brand_quality_test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "brand_quality_test_coverage" ADD CONSTRAINT "brand_quality_test_coverage_commodityGroupId_fkey" FOREIGN KEY ("commodityGroupId") REFERENCES "commodity_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
