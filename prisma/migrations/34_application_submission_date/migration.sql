-- AlterTable: "Tanggal Pengajuan" chosen by the user. Nullable on purpose — existing applications are
-- NOT backfilled (an Admin fills them in through Edit); displays fall back to createdAt meanwhile.
ALTER TABLE "application" ADD COLUMN "submissionDate" TIMESTAMP(3);
