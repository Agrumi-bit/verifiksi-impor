-- CreateEnum
CREATE TYPE "MerkImportGoodsType" AS ENUM ('BARANG_KONSUMSI', 'BAHAN_BAKU');

-- CreateEnum
CREATE TYPE "MerkCertificateType" AS ENUM ('TANDA_DAFTAR_MEREK', 'SERTIFIKAT_MEREK_TERDAFTAR', 'SERTIFIKAT_INTERNASIONAL', 'LAINNYA');

-- CreateEnum
CREATE TYPE "MerkImporterRelation" AS ENUM ('BRAND_OWNER_IS_IMPORTER', 'SEPARATE_IMPORTERS');

-- AlterTable
ALTER TABLE "merk" ADD COLUMN     "brandCategory" TEXT,
ADD COLUMN     "brandDescription" TEXT,
ADD COLUMN     "brandOwnerId" TEXT,
ADD COLUMN     "brandType" TEXT,
ADD COLUMN     "certificateType" "MerkCertificateType",
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "declarationAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "hasCertificate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "importGoodsType" "MerkImportGoodsType",
ADD COLUMN     "importerRelation" "MerkImporterRelation",
ADD COLUMN     "officialWebsite" TEXT,
ADD COLUMN     "supportingDocuments" JSONB;

-- CreateTable
CREATE TABLE "merk_importer" (
    "id" TEXT NOT NULL,
    "merkId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "authorizationDocumentPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merk_importer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_owner" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "city" TEXT,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_owner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merk_importer_merkId_idx" ON "merk_importer"("merkId");

-- CreateIndex
CREATE INDEX "merk_brandOwnerId_idx" ON "merk"("brandOwnerId");

-- AddForeignKey
ALTER TABLE "merk" ADD CONSTRAINT "merk_brandOwnerId_fkey" FOREIGN KEY ("brandOwnerId") REFERENCES "brand_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merk_importer" ADD CONSTRAINT "merk_importer_merkId_fkey" FOREIGN KEY ("merkId") REFERENCES "merk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

