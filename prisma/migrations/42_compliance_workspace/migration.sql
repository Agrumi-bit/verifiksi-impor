-- Compliance Workspace (VIU Konsumsi): its own case record (PIC, review flag, the 2 LPV administrative
-- checks), findings and their follow-up history. Additive only — new enums and tables, no change to
-- any existing table, no backfill.
-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('BELUM_DIREVIEW', 'DALAM_KONSOLIDASI', 'PERLU_TINDAK_LANJUT', 'PERLU_KLARIFIKASI', 'OPEN_ISSUE', 'COMPLIANCE_LENGKAP', 'SELESAI');

-- CreateEnum
CREATE TYPE "ComplianceIssueKind" AS ENUM ('OPEN', 'KLARIFIKASI', 'CONFLICT', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ComplianceIssueSeverity" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI');

-- CreateTable
CREATE TABLE "compliance_case" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'BELUM_DIREVIEW',
    "picUserId" TEXT,
    "reviewFlag" BOOLEAN NOT NULL DEFAULT false,
    "reviewFlaggedAt" TIMESTAMP(3),
    "reviewFlaggedByName" TEXT,
    "finalReviewDone" BOOLEAN NOT NULL DEFAULT false,
    "finalReviewAt" TIMESTAMP(3),
    "finalReviewByName" TEXT,
    "dossierComplete" BOOLEAN NOT NULL DEFAULT false,
    "dossierCompleteAt" TIMESTAMP(3),
    "dossierCompleteByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_issue" (
    "id" TEXT NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "kind" "ComplianceIssueKind" NOT NULL DEFAULT 'OPEN',
    "severity" "ComplianceIssueSeverity" NOT NULL DEFAULT 'SEDANG',
    "sourceWorkspace" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidenceA" TEXT,
    "evidenceB" TEXT,
    "ownerId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_issue_follow_up" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "status" "ComplianceIssueKind" NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_issue_follow_up_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_case_applicationId_key" ON "compliance_case"("applicationId");

-- CreateIndex
CREATE INDEX "compliance_case_picUserId_idx" ON "compliance_case"("picUserId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_issue_issueNumber_key" ON "compliance_issue"("issueNumber");

-- CreateIndex
CREATE INDEX "compliance_issue_applicationId_idx" ON "compliance_issue"("applicationId");

-- CreateIndex
CREATE INDEX "compliance_issue_kind_idx" ON "compliance_issue"("kind");

-- CreateIndex
CREATE INDEX "compliance_issue_follow_up_issueId_idx" ON "compliance_issue_follow_up"("issueId");

-- AddForeignKey
ALTER TABLE "compliance_case" ADD CONSTRAINT "compliance_case_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_case" ADD CONSTRAINT "compliance_case_picUserId_fkey" FOREIGN KEY ("picUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_issue" ADD CONSTRAINT "compliance_issue_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_issue" ADD CONSTRAINT "compliance_issue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_issue_follow_up" ADD CONSTRAINT "compliance_issue_follow_up_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "compliance_issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

