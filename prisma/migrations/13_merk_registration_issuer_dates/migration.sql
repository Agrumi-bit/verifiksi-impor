-- AlterTable
ALTER TABLE "merk"
    ADD COLUMN "registrationIssuer" TEXT,
    ADD COLUMN "registrationDate" TIMESTAMP(3),
    ADD COLUMN "registrationExpiryDate" TIMESTAMP(3);
