-- AlterEnum
ALTER TYPE "MerkStatus" ADD VALUE 'DRAFT';
-- AlterTable
ALTER TABLE "merk" ADD COLUMN     "logoPath" TEXT,
ADD COLUMN     "merekStatusLabel" TEXT,
ADD COLUMN     "trademarkClass" TEXT;
