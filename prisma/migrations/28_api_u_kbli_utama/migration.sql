-- CreateTable
CREATE TABLE "api_u_kbli_utama" (
    "id" TEXT NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "deactivationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_u_kbli_utama_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_u_kbli_utama_code_version_key" ON "api_u_kbli_utama"("code", "version");

-- Initial allowed list
INSERT INTO "api_u_kbli_utama" ("id", "code", "description", "version", "updatedAt") VALUES
  ('apiu_46411_2025', '46411', 'Perdagangan Besar Tekstil', 'KBLI 2025', CURRENT_TIMESTAMP),
  ('apiu_46411_2020', '46411', 'Perdagangan Besar Tekstil', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_46412_2025', '46412', 'Perdagangan Besar Pakaian', 'KBLI 2025', CURRENT_TIMESTAMP),
  ('apiu_46412_2020', '46412', 'Perdagangan Besar Pakaian', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_46414_2025', '46414', 'Perdagangan Besar Barang Jadi Tekstil', 'KBLI 2025', CURRENT_TIMESTAMP),
  ('apiu_46414_2020', '46414', 'Perdagangan Besar Barang Lainnya Dari Tekstil', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_46499_2025', '46499', 'Perdagangan Besar Berbagai Barang dan Perlengkapan Rumah Tangga Lainnya YTDL', 'KBLI 2025', CURRENT_TIMESTAMP),
  ('apiu_46499_2020', '46499', 'Perdagangan Besar Berbagai Barang dan Perlengkapan Rumah Tangga Lainnya YTDL', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_46691_2020', '46691', 'Perdagangan Besar Alat Laboratorium, Alat Farmasi Dan Alat Kedokteran Untuk Manusia', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_46699_2020', '46699', 'Perdagangan Besar Produk Lainnya YTDL', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_46100_2025', '46100', 'Perdagangan Besar Atas Dasar Balas Jasa (Fee) Atau Kontrak', 'KBLI 2025', CURRENT_TIMESTAMP),
  ('apiu_46100_2020', '46100', 'Perdagangan Besar Atas Dasar Balas Jasa (Fee) Atau Kontrak', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_45301_2020', '45301', 'Perdagangan Besar Suku Cadang Dan Aksesori Mobil', 'KBLI 2020', CURRENT_TIMESTAMP),
  ('apiu_46795_2025', '46795', 'Perdagangan Besar Barang dari Kertas dan Karton', 'KBLI 2025', CURRENT_TIMESTAMP);
