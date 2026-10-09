-- AlterTable: name of the Project Manager who approved/rejected the assignment's report (nullable, additive, no backfill).
ALTER TABLE "assignment" ADD COLUMN "pmReviewedByName" TEXT;
