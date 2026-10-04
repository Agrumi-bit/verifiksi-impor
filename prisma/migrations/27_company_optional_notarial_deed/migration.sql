-- AlterTable
ALTER TABLE "company" ALTER COLUMN "notarialDeedNumber" DROP NOT NULL,
ALTER COLUMN "notarialDeedIssueDate" DROP NOT NULL,
ALTER COLUMN "notarialIssuingAuthority" DROP NOT NULL,
ALTER COLUMN "notarialDocumentPath" DROP NOT NULL;
