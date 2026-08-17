-- CreateEnum
CREATE TYPE "LoginSlideStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "branding_settings" (
    "id" TEXT NOT NULL DEFAULT 'branding',
    "appName" TEXT NOT NULL DEFAULT 'VKI & VIU Platform',
    "appSubtitle" TEXT NOT NULL DEFAULT 'Sistem Verifikasi Kemampuan Industri & Verifikasi Importir Umum',
    "sidebarBrandTitle" TEXT NOT NULL DEFAULT 'VKI & VIU',
    "sidebarBrandSubtitle" TEXT NOT NULL DEFAULT 'Admin Portal',
    "logoPath" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#e0662e',
    "primaryColorForeground" TEXT NOT NULL DEFAULT '#ffffff',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_slide" (
    "id" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaUrl" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "LoginSlideStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smtp_settings" (
    "id" TEXT NOT NULL DEFAULT 'smtp',
    "host" TEXT NOT NULL DEFAULT 'smtp.hostinger.com',
    "port" INTEGER NOT NULL DEFAULT 465,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL DEFAULT '',
    "fromName" TEXT NOT NULL DEFAULT '',
    "fromEmail" TEXT NOT NULL DEFAULT '',
    "replyTo" TEXT NOT NULL DEFAULT '',
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id")
);
