export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SURVEYOR",
  "VERIFIKATOR",
  "TECHNICAL_ANALYST",
  "COMPLIANCE",
  "PROJECT_MANAGER",
  "PERUSAHAAN",
  "CUSTOMER_RELATIONSHIP",
  "GOVERNMENT",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SURVEYOR: "Surveyor",
  VERIFIKATOR: "Verifikator",
  TECHNICAL_ANALYST: "Technical Analyst",
  COMPLIANCE: "Compliance",
  PROJECT_MANAGER: "Project Manager",
  PERUSAHAAN: "Perusahaan",
  CUSTOMER_RELATIONSHIP: "Customer Relationship",
  GOVERNMENT: "Government",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Akses penuh ke seluruh modul dan konfigurasi sistem.",
  ADMIN: "Mengelola operasional harian platform.",
  SURVEYOR: "Melaksanakan verifikasi lapangan (on-site verification).",
  VERIFIKATOR: "Melakukan verifikasi dan validasi dokumen permohonan.",
  TECHNICAL_ANALYST: "Menganalisis kelengkapan teknis permohonan.",
  COMPLIANCE: "Memastikan kepatuhan proses terhadap regulasi.",
  PROJECT_MANAGER: "Mengelola penugasan dan jadwal verifikasi.",
  PERUSAHAAN: "Akses eksternal untuk perusahaan pemohon.",
  CUSTOMER_RELATIONSHIP: "Menangani komunikasi dengan perusahaan pemohon.",
  GOVERNMENT: "Akses pemantauan untuk instansi pemerintah terkait.",
};
