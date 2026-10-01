-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ADMINISTRATIVE_REVIEW', 'SURVEY_SCHEDULED', 'FIELD_VERIFICATION', 'VERIFICATION', 'TECHNICAL_REVIEW', 'COMPLIANCE_REVIEW', 'REPORT_GENERATION', 'COMPLETED', 'RETURNED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('IN', 'OUT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('INDUSTRI', 'NON_INDUSTRI');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('NOT_YET_VERIFIED', 'VERIFIED', 'NEED_REVISION', 'REJECTED', 'NOT_APPLICABLE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MerkOwnershipType" AS ENUM ('MILIK_SENDIRI', 'LISENSI');

-- CreateEnum
CREATE TYPE "MerkStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MasterDataStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssignmentPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AssignmentLetterStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "LocationVisitStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SurveyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT DEFAULT 'SURVEYOR',
    "companyId" TEXT,
    "username" TEXT,
    "phone" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "applicationCategory" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "payload" JSONB NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "crOutcome" TEXT,
    "crDocumentVerifications" JSONB,
    "crFollowUpDate" TIMESTAMP(3),
    "crNotes" TEXT,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_message" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "contractNumber" TEXT NOT NULL,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "contractEndDate" TIMESTAMP(3) NOT NULL,
    "contractDocumentPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoPath" TEXT,
    "apiType" TEXT,
    "companyName" TEXT NOT NULL,
    "companyType" TEXT NOT NULL,
    "investmentStatus" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "companyPhone" TEXT NOT NULL,
    "companyWebsite" TEXT,
    "contactFullName" TEXT NOT NULL,
    "contactDesignation" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contacts" JSONB NOT NULL DEFAULT '[]',
    "addressJalan" TEXT,
    "addressDesa" TEXT,
    "addressKecamatan" TEXT,
    "addressKota" TEXT,
    "addressProvinsi" TEXT,
    "addressKodePos" TEXT,
    "nibNumber" TEXT NOT NULL,
    "nibIssueDate" TIMESTAMP(3) NOT NULL,
    "nibDocumentPath" TEXT NOT NULL,
    "kbliEntries" JSONB NOT NULL,
    "kbliDocumentPath" TEXT NOT NULL,
    "notarialDeedNumber" TEXT NOT NULL,
    "notarialDeedIssueDate" TIMESTAMP(3) NOT NULL,
    "notarialIssuingAuthority" TEXT NOT NULL,
    "notarialAmendmentInfo" TEXT,
    "notarialDocumentPath" TEXT NOT NULL,
    "notarialAmendmentNumber" TEXT,
    "notarialAmendmentDate" TIMESTAMP(3),
    "notarialAmendmentAuthority" TEXT,
    "notarialAmendmentDocPath" TEXT,
    "skNumber" TEXT,
    "skDate" TIMESTAMP(3),
    "skDocumentPath" TEXT,
    "npwpNumber" TEXT,
    "npwpDocumentPath" TEXT,
    "companyAge" TEXT,
    "taxProofs" JSONB NOT NULL DEFAULT '[]',
    "sktNumber" TEXT,
    "sktIssuer" TEXT,
    "sktDate" TIMESTAMP(3),
    "sktDocumentPath" TEXT,
    "locations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_document_version" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "path" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'NOT_YET_VERIFIED',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByRole" TEXT,
    "rejectionNote" TEXT,
    "checklistResult" JSONB,

    CONSTRAINT "company_document_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_document_version" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "path" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'NOT_YET_VERIFIED',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByRole" TEXT,
    "rejectionNote" TEXT,
    "checklistResult" JSONB,

    CONSTRAINT "application_document_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_draft" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_draft" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merk" (
    "id" TEXT NOT NULL,
    "status" "MerkStatus" NOT NULL DEFAULT 'ACTIVE',
    "brandName" TEXT NOT NULL,
    "productCategory" TEXT NOT NULL,
    "countryOfOrigin" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "registrationDocumentPath" TEXT NOT NULL,
    "ownershipType" "MerkOwnershipType" NOT NULL,
    "brandOwnerName" TEXT NOT NULL,
    "licenseAgreementNumber" TEXT,
    "licenseStartDate" TIMESTAMP(3),
    "licenseEndDate" TIMESTAMP(3),
    "licenseDocumentPath" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_of_measurement" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_of_measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commodity_group" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commodity_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commodity_sub_group" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "commodityGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commodity_sub_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kbli_master_data" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '-',
    "version" TEXT NOT NULL DEFAULT 'KBLI 2020',
    "deactivationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kbli_master_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hs_code_master_data" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "hsCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "commodityGroupId" TEXT NOT NULL,
    "commoditySubGroupId" TEXT NOT NULL,
    "unitOfMeasurementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hs_code_master_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lartas_impor" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "hsCodeId" TEXT NOT NULL,
    "apiP" BOOLEAN NOT NULL DEFAULT false,
    "apiUIndustri" BOOLEAN NOT NULL DEFAULT false,
    "apiUNonIndustri" BOOLEAN NOT NULL DEFAULT false,
    "barangKonsumsi" BOOLEAN NOT NULL DEFAULT false,
    "ppbb" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lartas_impor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" TEXT NOT NULL,
    "assignmentNumber" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "priority" "AssignmentPriority" NOT NULL DEFAULT 'MEDIUM',
    "applicationId" TEXT NOT NULL,
    "surveyorId" TEXT,
    "verifikatorId" TEXT,
    "technicalReviewerId" TEXT,
    "scheduleType" TEXT,
    "letterNumber" TEXT,
    "letterStatus" "AssignmentLetterStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "dueDate" TIMESTAMP(3),
    "location" TEXT,
    "teamMembers" JSONB,
    "businessType" TEXT,
    "productCategory" TEXT,
    "documentVerifications" JSONB,
    "productVerifications" JSONB,
    "machineVerifications" JSONB,
    "productionQtyVerifications" JSONB,
    "validationNotes" TEXT,
    "validatedAt" TIMESTAMP(3),
    "signaturePath" TEXT,
    "signatureDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_visit" (
    "id" TEXT NOT NULL,
    "status" "LocationVisitStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignmentId" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "description" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "checklist" JSONB,
    "fieldObservationNotes" TEXT,
    "photos" JSONB,
    "interviews" JSONB,
    "findings" JSONB,
    "reportSummary" TEXT,
    "officeVerification" JSONB,
    "warehouseVerification" JSONB,
    "factoryVerification" JSONB,
    "reportVerification" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_report" (
    "id" TEXT NOT NULL,
    "status" "SurveyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "assignmentId" TEXT NOT NULL,
    "checklist" JSONB,
    "evidence" JSONB,
    "findings" JSONB,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "application_applicationNumber_key" ON "application"("applicationNumber");

-- CreateIndex
CREATE INDEX "application_companyId_idx" ON "application"("companyId");

-- CreateIndex
CREATE INDEX "application_message_applicationId_idx" ON "application_message"("applicationId");

-- CreateIndex
CREATE INDEX "partner_companyId_idx" ON "partner"("companyId");

-- CreateIndex
CREATE INDEX "partner_type_idx" ON "partner"("type");

-- CreateIndex
CREATE INDEX "company_document_version_companyId_fieldKey_idx" ON "company_document_version"("companyId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "company_document_version_companyId_fieldKey_version_key" ON "company_document_version"("companyId", "fieldKey", "version");

-- CreateIndex
CREATE INDEX "application_document_version_applicationId_fieldKey_idx" ON "application_document_version"("applicationId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "application_document_version_applicationId_fieldKey_version_key" ON "application_document_version"("applicationId", "fieldKey", "version");

-- CreateIndex
CREATE INDEX "company_draft_createdById_idx" ON "company_draft"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "application_draft_createdById_key" ON "application_draft"("createdById");

-- CreateIndex
CREATE INDEX "merk_companyId_idx" ON "merk"("companyId");

-- CreateIndex
CREATE INDEX "commodity_sub_group_commodityGroupId_idx" ON "commodity_sub_group"("commodityGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "kbli_master_data_code_version_key" ON "kbli_master_data"("code", "version");

-- CreateIndex
CREATE INDEX "hs_code_master_data_commodityGroupId_idx" ON "hs_code_master_data"("commodityGroupId");

-- CreateIndex
CREATE INDEX "hs_code_master_data_commoditySubGroupId_idx" ON "hs_code_master_data"("commoditySubGroupId");

-- CreateIndex
CREATE INDEX "hs_code_master_data_unitOfMeasurementId_idx" ON "hs_code_master_data"("unitOfMeasurementId");

-- CreateIndex
CREATE INDEX "lartas_impor_hsCodeId_idx" ON "lartas_impor"("hsCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_assignmentNumber_key" ON "assignment"("assignmentNumber");

-- CreateIndex
CREATE INDEX "assignment_applicationId_idx" ON "assignment"("applicationId");

-- CreateIndex
CREATE INDEX "assignment_surveyorId_idx" ON "assignment"("surveyorId");

-- CreateIndex
CREATE INDEX "assignment_verifikatorId_idx" ON "assignment"("verifikatorId");

-- CreateIndex
CREATE INDEX "assignment_technicalReviewerId_idx" ON "assignment"("technicalReviewerId");

-- CreateIndex
CREATE INDEX "location_visit_assignmentId_idx" ON "location_visit"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_report_assignmentId_key" ON "survey_report"("assignmentId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_message" ADD CONSTRAINT "application_message_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner" ADD CONSTRAINT "partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_document_version" ADD CONSTRAINT "company_document_version_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_document_version" ADD CONSTRAINT "company_document_version_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_document_version" ADD CONSTRAINT "company_document_version_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_document_version" ADD CONSTRAINT "application_document_version_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_document_version" ADD CONSTRAINT "application_document_version_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_document_version" ADD CONSTRAINT "application_document_version_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merk" ADD CONSTRAINT "merk_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commodity_sub_group" ADD CONSTRAINT "commodity_sub_group_commodityGroupId_fkey" FOREIGN KEY ("commodityGroupId") REFERENCES "commodity_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hs_code_master_data" ADD CONSTRAINT "hs_code_master_data_commodityGroupId_fkey" FOREIGN KEY ("commodityGroupId") REFERENCES "commodity_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hs_code_master_data" ADD CONSTRAINT "hs_code_master_data_commoditySubGroupId_fkey" FOREIGN KEY ("commoditySubGroupId") REFERENCES "commodity_sub_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hs_code_master_data" ADD CONSTRAINT "hs_code_master_data_unitOfMeasurementId_fkey" FOREIGN KEY ("unitOfMeasurementId") REFERENCES "unit_of_measurement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lartas_impor" ADD CONSTRAINT "lartas_impor_hsCodeId_fkey" FOREIGN KEY ("hsCodeId") REFERENCES "hs_code_master_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_surveyorId_fkey" FOREIGN KEY ("surveyorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_verifikatorId_fkey" FOREIGN KEY ("verifikatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_technicalReviewerId_fkey" FOREIGN KEY ("technicalReviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_visit" ADD CONSTRAINT "location_visit_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_report" ADD CONSTRAINT "survey_report_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

