import {
  Banknote,
  Building2,
  Cog,
  Eye,
  FileStack,
  FileText,
  Gauge,
  Handshake,
  Hash,
  MapPin,
  Package,
  Send,
  ShoppingCart,
  Factory,
  Boxes,
  type LucideIcon,
} from "lucide-react";

export type WizardStepMeta = {
  step: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  implemented: boolean;
};

/** VIU now mirrors VKI's Legal/Tax/Location step format (read-only company-data display,
 * followed by the locked+add-new location editor), plus its own dedicated Partner Industri
 * step (split out of Support Document — see StepPartnerIndustri) for the
 * "Bahan Baku dan/atau Penolong — Perusahaan Industri" import type — 10 steps instead of
 * the original 8. */
export const VIU_WIZARD_STEPS: WizardStepMeta[] = [
  {
    step: 1,
    title: "Company Information",
    subtitle: "Pilih perusahaan terdaftar",
    icon: Building2,
    implemented: true,
  },
  {
    step: 2,
    title: "Application Information",
    subtitle: "Type, category & reference",
    icon: Hash,
    implemented: true,
  },
  {
    step: 3,
    title: "Legal Information",
    subtitle: "Licenses & registrations",
    icon: FileText,
    implemented: true,
  },
  {
    step: 4,
    title: "Tax Information",
    subtitle: "NPWP",
    icon: Banknote,
    implemented: true,
  },
  {
    step: 5,
    title: "Location Information",
    subtitle: "Factory & GPS address",
    icon: MapPin,
    implemented: true,
  },
  {
    step: 6,
    title: "Partner Industri",
    subtitle: "Impor bahan baku — perusahaan industri",
    icon: Handshake,
    implemented: true,
  },
  {
    step: 7,
    title: "Support Document",
    subtitle: "Upload dokumen pendukung",
    icon: FileStack,
    implemented: true,
  },
  {
    step: 8,
    title: "Product Information",
    subtitle: "Detail produk & material",
    icon: Package,
    implemented: true,
  },
  {
    step: 9,
    title: "Preview",
    subtitle: "Tinjau sebelum submit",
    icon: Eye,
    implemented: true,
  },
  {
    step: 10,
    title: "Submit",
    subtitle: "Kirim permohonan",
    icon: Send,
    implemented: true,
  },
];

/** VKI's 14-step flow, per the updated Claude Design (isAppWizardStep1..14). */
export const VKI_WIZARD_STEPS: WizardStepMeta[] = [
  { step: 1, title: "Company Information", subtitle: "Pilih perusahaan terdaftar", icon: Building2, implemented: true },
  { step: 2, title: "Application Information", subtitle: "Type, category & reference", icon: Hash, implemented: true },
  { step: 3, title: "Legal Information", subtitle: "NIB, Akta, SK, KBLI", icon: FileText, implemented: true },
  { step: 4, title: "Tax Information", subtitle: "NPWP", icon: Banknote, implemented: true },
  { step: 5, title: "Location Information", subtitle: "Lokasi perusahaan", icon: MapPin, implemented: true },
  { step: 6, title: "Support Document", subtitle: "Upload dokumen pendukung", icon: FileStack, implemented: true },
  { step: 7, title: "Data Mesin", subtitle: "Mesin produksi", icon: Cog, implemented: true },
  { step: 8, title: "Product Information", subtitle: "Produk & bahan baku", icon: Package, implemented: true },
  { step: 9, title: "Kapasitas", subtitle: "Izin & kapasitas terpasang", icon: Gauge, implemented: true },
  { step: 10, title: "Jumlah Produksi", subtitle: "Estimasi produksi", icon: Factory, implemented: true },
  { step: 11, title: "Bahan Baku yang Digunakan", subtitle: "Penggunaan & stock", icon: Boxes, implemented: true },
  { step: 12, title: "Penjualan", subtitle: "Dalam & luar negeri", icon: ShoppingCart, implemented: true },
  { step: 13, title: "Preview", subtitle: "Tinjau sebelum submit", icon: Eye, implemented: true },
  { step: 14, title: "Submit", subtitle: "Kirim permohonan", icon: Send, implemented: true },
];

// Backward-compatible aliases — existing imports keep working (VIU is the default path).
export const WIZARD_STEPS = VIU_WIZARD_STEPS;
export const TOTAL_WIZARD_STEPS = VIU_WIZARD_STEPS.length;
export const IMPLEMENTED_WIZARD_STEPS = VIU_WIZARD_STEPS.filter((step) => step.implemented).length;
