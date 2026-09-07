-- CreateTable
CREATE TABLE "country_master_data" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_master_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_master_data_code_key" ON "country_master_data"("code");
