-- AlterTable
ALTER TABLE "assignment" ADD COLUMN     "lastReturnNotes" TEXT,
ADD COLUMN     "revisionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revisionReceivedAt" TIMESTAMP(3);
