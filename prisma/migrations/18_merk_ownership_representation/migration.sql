
-- CreateEnum
CREATE TYPE "MerkOwnerLocation" AS ENUM ('DOMESTIC', 'FOREIGN');

-- CreateEnum
CREATE TYPE "MerkOwnerType" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "MerkForeignEntityType" AS ENUM ('COMPANY', 'ORGANIZATION', 'INDIVIDUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MerkApiuRelationship" AS ENUM ('APIU_IS_OWNER', 'APIU_IS_IMPORTER');

-- CreateEnum
CREATE TYPE "MerkRepresentationType" AS ENUM ('APIU_OFFICIAL_REPRESENTATIVE', 'OTHER_OFFICIAL_REPRESENTATIVE', 'APPOINTED_IMPORTER');

-- CreateEnum
CREATE TYPE "MerkAgreementType" AS ENUM ('LISENSI', 'SUBLISENSI');

-- CreateEnum
CREATE TYPE "MerkAppointmentSource" AS ENUM ('BRAND_OWNER', 'OFFICIAL_REPRESENTATIVE');

-- CreateTable
CREATE TABLE "merk_ownership" (
    "id" TEXT NOT NULL,
    "merkId" TEXT NOT NULL,
    "ownerLocation" "MerkOwnerLocation" NOT NULL,
    "ownerType" "MerkOwnerType",
    "ownerCompanyId" TEXT,
    "ownerName" TEXT,
    "ownerAddress" TEXT,
    "relationshipWithApiu" "MerkApiuRelationship",
    "foreignEntityType" "MerkForeignEntityType",
    "ownerCountryCode" TEXT,
    "foreignRegistrationNumber" TEXT,
    "representationType" "MerkRepresentationType",
    "officialRepresentativeId" TEXT,
    "agreementType" "MerkAgreementType",
    "agreementNumber" TEXT,
    "agreementStartDate" TIMESTAMP(3),
    "agreementEndDate" TIMESTAMP(3),
    "appointmentSource" "MerkAppointmentSource",
    "appointmentLetterNumber" TEXT,
    "appointmentStartDate" TIMESTAMP(3),
    "appointmentEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merk_ownership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merk_ownership_merkId_key" ON "merk_ownership"("merkId");

-- CreateIndex
CREATE INDEX "merk_ownership_ownerCompanyId_idx" ON "merk_ownership"("ownerCompanyId");

-- CreateIndex
CREATE INDEX "merk_ownership_officialRepresentativeId_idx" ON "merk_ownership"("officialRepresentativeId");

-- AddForeignKey
ALTER TABLE "merk_ownership" ADD CONSTRAINT "merk_ownership_merkId_fkey" FOREIGN KEY ("merkId") REFERENCES "merk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merk_ownership" ADD CONSTRAINT "merk_ownership_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "brand_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merk_ownership" ADD CONSTRAINT "merk_ownership_officialRepresentativeId_fkey" FOREIGN KEY ("officialRepresentativeId") REFERENCES "brand_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

