-- AlterTable: tanggal penyusunan of the Laporan Pelaksanaan (Pelaporan Pasal 47), set by the Project Manager
-- on "Generate Laporan" (YYYY-MM-DD, nullable, additive, no backfill).
ALTER TABLE "pasal47_report" ADD COLUMN "preparedAt" TEXT;
