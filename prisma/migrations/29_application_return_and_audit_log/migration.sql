-- AlterTable
ALTER TABLE "application" ADD COLUMN     "returnReason" TEXT,
ADD COLUMN     "returnSections" JSONB,
ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "returnedById" TEXT,
ADD COLUMN     "returnedByRole" TEXT;

-- CreateTable
CREATE TABLE "application_audit_log" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "reason" TEXT,
    "sections" JSONB,
    "changedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_audit_log_applicationId_idx" ON "application_audit_log"("applicationId");

-- AddForeignKey
ALTER TABLE "application_audit_log" ADD CONSTRAINT "application_audit_log_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
