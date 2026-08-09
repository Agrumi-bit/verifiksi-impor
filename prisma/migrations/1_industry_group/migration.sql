-- AlterTable
ALTER TABLE "commodity_group" ADD COLUMN     "industryGroupId" TEXT;

-- CreateTable
CREATE TABLE "industry_group" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commodity_group_industryGroupId_idx" ON "commodity_group"("industryGroupId");

-- AddForeignKey
ALTER TABLE "commodity_group" ADD CONSTRAINT "commodity_group_industryGroupId_fkey" FOREIGN KEY ("industryGroupId") REFERENCES "industry_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

