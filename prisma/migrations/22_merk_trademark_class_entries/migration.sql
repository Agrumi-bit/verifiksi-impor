-- CreateTable
CREATE TABLE "merk_trademark_class_entry" (
    "id" TEXT NOT NULL,
    "merkId" TEXT NOT NULL,
    "trademarkClass" TEXT NOT NULL,
    "trademarkClassDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merk_trademark_class_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merk_trademark_class_entry_merkId_idx" ON "merk_trademark_class_entry"("merkId");

-- AddForeignKey
ALTER TABLE "merk_trademark_class_entry" ADD CONSTRAINT "merk_trademark_class_entry_merkId_fkey" FOREIGN KEY ("merkId") REFERENCES "merk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one entry per existing brand that already has a class, from the
-- legacy scalar columns — keeps existing brands showing their class after
-- this migration instead of appearing to have none.
-- md5(random) instead of gen_random_uuid()/uuid_generate_v4() so this
-- doesn't depend on the pgcrypto/uuid-ossp extension being enabled.
INSERT INTO "merk_trademark_class_entry" ("id", "merkId", "trademarkClass", "trademarkClassDescription", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", "trademarkClass", COALESCE("trademarkClassDescription", ''), NOW(), NOW()
FROM "merk"
WHERE "trademarkClass" IS NOT NULL;
