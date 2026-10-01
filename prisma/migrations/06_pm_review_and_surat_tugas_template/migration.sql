-- CreateEnum
CREATE TYPE "PmReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "assignment" ADD COLUMN     "letterReviewNote" TEXT,
ADD COLUMN     "pmReviewNote" TEXT,
ADD COLUMN     "pmReviewStatus" "PmReviewStatus",
ADD COLUMN     "pmReviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "surat_tugas_template" (
    "id" TEXT NOT NULL DEFAULT 'surat-tugas',
    "headerImagePath" TEXT,
    "orgName" TEXT NOT NULL DEFAULT 'PT Tribhakti Inspektama',
    "orgSubtitle" TEXT NOT NULL DEFAULT 'Laboratory & Integrated Services',
    "letterTitle" TEXT NOT NULL DEFAULT 'SURAT TUGAS',
    "nomorLabel" TEXT NOT NULL DEFAULT 'Nomor',
    "docNumberLabel" TEXT NOT NULL DEFAULT 'No. Dokumen',
    "docNumber" TEXT NOT NULL DEFAULT '',
    "docRevisionLabel" TEXT NOT NULL DEFAULT 'No. Terbitan',
    "docRevision" TEXT NOT NULL DEFAULT '',
    "docAmendmentLabel" TEXT NOT NULL DEFAULT 'No. Revisi',
    "docAmendment" TEXT NOT NULL DEFAULT '',
    "docEffectiveLabel" TEXT NOT NULL DEFAULT 'Berlaku Mulai',
    "docEffectiveDate" TEXT NOT NULL DEFAULT '',
    "openingSentence" TEXT NOT NULL DEFAULT 'Yang bertanda tangan di bawah ini, Customer Relation Workspace, dengan ini menugaskan:',
    "namaLabel" TEXT NOT NULL DEFAULT 'Nama',
    "peranLabel" TEXT NOT NULL DEFAULT 'Peran',
    "assignmentPrefix" TEXT NOT NULL DEFAULT 'Untuk melaksanakan',
    "assignmentSuffix" TEXT NOT NULL DEFAULT 'pada:',
    "perusahaanLabel" TEXT NOT NULL DEFAULT 'Perusahaan',
    "idAplikasiLabel" TEXT NOT NULL DEFAULT 'ID Aplikasi',
    "fasilitasLabel" TEXT NOT NULL DEFAULT 'Fasilitas',
    "tanggalLabel" TEXT NOT NULL DEFAULT 'Tanggal Pelaksanaan',
    "closingSentence" TEXT NOT NULL DEFAULT 'Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.',
    "draftNoticeText" TEXT NOT NULL DEFAULT 'Dokumen ini masih berupa draft dan menunggu persetujuan Project Manager sebelum berlaku resmi.',
    "signatureCity" TEXT NOT NULL DEFAULT 'Jakarta',
    "signerLabel" TEXT NOT NULL DEFAULT 'Customer Relation',
    "footerImagePath" TEXT,
    "confidentialityNotice" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_tugas_template_pkey" PRIMARY KEY ("id")
);
