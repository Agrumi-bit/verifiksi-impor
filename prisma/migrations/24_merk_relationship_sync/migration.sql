-- CreateEnum
CREATE TYPE "MerkRelationshipRole" AS ENUM ('IMPORTER_ONLY', 'OFFICIAL_REPRESENTATIVE', 'OWNER');

-- CreateEnum
CREATE TYPE "MerkRelationshipSource" AS ENUM ('MANUAL', 'APPLICATION');

-- AlterTable
ALTER TABLE "merk_importer" ADD COLUMN     "appointmentSource" "MerkAppointmentSource",
ADD COLUMN     "authorizationDocumentName" TEXT,
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "role" "MerkRelationshipRole",
ADD COLUMN     "sourceApplicationId" TEXT,
ADD COLUMN     "sourceType" "MerkRelationshipSource" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "authorizationDocumentPath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "merk_importer_companyId_idx" ON "merk_importer"("companyId");

-- CreateIndex
CREATE INDEX "merk_importer_sourceApplicationId_idx" ON "merk_importer"("sourceApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "merk_importer_merkId_companyId_sourceApplicationId_key" ON "merk_importer"("merkId", "companyId", "sourceApplicationId");

-- AddForeignKey
ALTER TABLE "merk_importer" ADD CONSTRAINT "merk_importer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merk_importer" ADD CONSTRAINT "merk_importer_sourceApplicationId_fkey" FOREIGN KEY ("sourceApplicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
