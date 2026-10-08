-- CreateTable: Pelaporan Pasal 47 — the Project Manager's review state for one scheme and reporting
-- period (status Draft/Reviewed/Approved, PM note, materiality per finding key). Additive only.
CREATE TABLE "pasal47_report" (
    "id" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "periodFrom" TEXT NOT NULL,
    "periodTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pmNote" TEXT NOT NULL DEFAULT '',
    "materiality" JSONB NOT NULL DEFAULT '{}',
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pasal47_report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pasal47_report_scheme_periodFrom_periodTo_key" ON "pasal47_report"("scheme", "periodFrom", "periodTo");
