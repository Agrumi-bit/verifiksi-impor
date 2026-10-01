-- CreateTable
CREATE TABLE "electricity_tariff_master_data" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "kelompok" TEXT NOT NULL,
    "golongan" TEXT NOT NULL,
    "batasDaya" TEXT NOT NULL,
    "tarifPerKwh" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electricity_tariff_master_data_pkey" PRIMARY KEY ("id")
);
