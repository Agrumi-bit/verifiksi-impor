-- Repairs schema drift from commit 63bd218 ("feat: dedicated report logo
-- branding setting"), which added BrandingSettings.reportLogoPath to the
-- Prisma schema without a migration. IF NOT EXISTS keeps this safe on any
-- environment where the column was already added out-of-band (e.g. db push).

-- AlterTable
ALTER TABLE "branding_settings" ADD COLUMN IF NOT EXISTS "reportLogoPath" TEXT;
