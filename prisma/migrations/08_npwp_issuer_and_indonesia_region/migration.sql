-- AlterTable
ALTER TABLE "company" ADD COLUMN     "npwpIssuer" TEXT;

-- CreateTable
CREATE TABLE "indonesia_region" (
    "id" TEXT NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "provinceName" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    "cityName" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,
    "districtName" TEXT NOT NULL,
    "subdistrictId" INTEGER NOT NULL,
    "subdistrictName" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,

    CONSTRAINT "indonesia_region_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "indonesia_region_provinceId_idx" ON "indonesia_region"("provinceId");

-- CreateIndex
CREATE INDEX "indonesia_region_cityId_idx" ON "indonesia_region"("cityId");

-- CreateIndex
CREATE INDEX "indonesia_region_districtId_idx" ON "indonesia_region"("districtId");

-- CreateIndex
CREATE INDEX "indonesia_region_subdistrictId_idx" ON "indonesia_region"("subdistrictId");
