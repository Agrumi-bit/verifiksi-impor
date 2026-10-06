-- AlterTable: survey results belong to the application's location, so a visit carries its
-- application directly (backfilled from its assignment). Additive and safe on existing data;
-- the one-visit-per-location UNIQUE constraint is a separate, later migration that can only be
-- applied once duplicate visits have been cleaned up.
ALTER TABLE "location_visit" ADD COLUMN "applicationId" TEXT;

UPDATE "location_visit" AS lv
SET "applicationId" = a."applicationId"
FROM "assignment" AS a
WHERE a."id" = lv."assignmentId";

ALTER TABLE "location_visit" ALTER COLUMN "applicationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "location_visit_applicationId_companyLocationId_idx" ON "location_visit"("applicationId", "companyLocationId");

-- AddForeignKey
ALTER TABLE "location_visit" ADD CONSTRAINT "location_visit_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
