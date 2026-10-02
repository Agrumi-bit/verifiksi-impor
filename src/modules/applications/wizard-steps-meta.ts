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

import { KONSUMSI_STEPS } from "./viu-schemes/konsumsi/steps";

export type WizardStepMeta = {
  /** Stable identity for this step — never changes even when `step` (the
   * displayed position) shifts because an earlier step was filtered out.
   * Use this, not `step`, as the lookup key into anything indexed per-step
   * (VIU_STEP_FIELD_NAMES, error/field maps, etc.). */
  key: string;
  step: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  implemented: boolean;
};

/** VIU now mirrors VKI's Legal/Tax/Location step format (read-only company-data display,
 * followed by the locked+add-new location editor), plus its own dedicated Partner Industri
 * step (split out of Support Document — see StepPartnerIndustri) for the
 * "Bahan Baku dan/atau Penolong — Perusahaan Industri" import type. The "Barang Konsumsi"
 * scheme's own steps (Merek yang Digunakan, Hasil Uji Mutu) are NOT declared here — they're
 * owned and contributed by `viu-schemes/konsumsi/steps.ts`'s `KONSUMSI_STEPS`, composed in by
 * `getViuWizardSteps` below. This shared list only ever declares steps no scheme module has
 * claimed ownership of. */
export const VIU_WIZARD_STEPS_BASE: WizardStepMeta[] = [
  {
    key: "company",
    step: 1,
    title: "Company Information",
    subtitle: "Pilih perusahaan terdaftar",
    icon: Building2,
    implemented: true,
  },
  {
    key: "application-info",
    step: 2,
    title: "Application Information",
    subtitle: "Type, category & reference",
    icon: Hash,
    implemented: true,
  },
  {
    key: "legal",
    step: 3,
    title: "Legal Information",
    subtitle: "Licenses & registrations",
    icon: FileText,
    implemented: true,
  },
  {
    key: "tax",
    step: 4,
    title: "Tax Information",
    subtitle: "NPWP",
    icon: Banknote,
    implemented: true,
  },
  {
    key: "location",
    step: 5,
    title: "Location Information",
    subtitle: "Factory & GPS address",
    icon: MapPin,
    implemented: true,
  },
  {
    key: "partner-industri",
    step: 0,
    title: "Partner Industri",
    subtitle: "Impor bahan baku — perusahaan industri",
    icon: Handshake,
    implemented: true,
  },
  {
    key: "support-document",
    step: 0,
    title: "Support Document",
    subtitle: "Upload dokumen pendukung",
    icon: FileStack,
    implemented: true,
  },
  {
    key: "product-info",
    step: 0,
    title: "Product Information",
    subtitle: "Detail produk & material",
    icon: Package,
    implemented: true,
  },
  {
    key: "preview",
    step: 0,
    title: "Preview",
    subtitle: "Tinjau sebelum submit",
    icon: Eye,
    implemented: true,
  },
  {
    key: "submit",
    step: 0,
    title: "Submit",
    subtitle: "Kirim permohonan",
    icon: Send,
    implemented: true,
  },
];

function composeViuSteps(
  base: WizardStepMeta[],
  konsumsiSteps: WizardStepMeta[],
  includeKonsumsi: boolean,
  includeIndustri: boolean,
): WizardStepMeta[] {
  const before = base.filter((s) => !["partner-industri", "support-document", "product-info", "preview", "submit"].includes(s.key));
  const after = base.map((s) => {
    // "Support Document" now also carries the Bukti Kemampuan Finansial (modal) checklist for
    // Barang Konsumsi (Step5SupportDocument's own `needsModalDocs`), so the step's displayed name
    // reflects that purpose whenever Konsumsi is selected — Industri/Non-Industri-only keeps the
    // generic "Support Document" title since that's still an accurate description for them.
    if (s.key === "support-document" && includeKonsumsi) {
      return { ...s, title: "Bukti Kemampuan Finansial", subtitle: "Dokumen modal & pendukung impor" };
    }
    return s;
  }).filter((s) => ["support-document", "product-info", "preview", "submit"].includes(s.key));
  const partnerIndustri = includeIndustri ? base.filter((s) => s.key === "partner-industri") : [];
  const konsumsi = includeKonsumsi ? konsumsiSteps : [];
  const steps = [...before, ...konsumsi, ...partnerIndustri, ...after];
  return steps.map((s, index) => ({ ...s, step: index + 1 }));
}

/** Full, unfiltered VIU step list (every scheme's steps included) — kept for
 * backward compatibility with any external reference to the old flat
 * `VIU_WIZARD_STEPS`. Prefer `getViuWizardSteps(importTypes)` for anything
 * rendering the live wizard, which is scoped to only the enabled schemes. */
export const VIU_WIZARD_STEPS: WizardStepMeta[] = composeViuSteps(VIU_WIZARD_STEPS_BASE, KONSUMSI_STEPS, true, true);

/**
 * VIU's step list, composed per-application from:
 * - shared steps every VIU application has (Company → Location, then
 *   Support Document → Submit)
 * - `viu-schemes/konsumsi/steps.ts`'s `KONSUMSI_STEPS`, included only when
 *   `importTypes.includes("BARANG_KONSUMSI")`
 * - "Partner Industri", included only when `importTypes.includes("BAHAN_BAKU_INDUSTRI")`
 *
 * A Barang-Konsumsi-only application has nothing to show for Partner
 * Industri (see StepPartnerIndustri's own gate) and vice versa — rather
 * than showing an empty/not-applicable step, the step is dropped from the
 * nav entirely and later steps renumber to stay sequential. `key` is what
 * everything else (field-name maps, the step-content switch) should look
 * up by, since `step` shifts depending on which schemes are enabled.
 */
export function getViuWizardSteps(importTypes: string[]): WizardStepMeta[] {
  return composeViuSteps(
    VIU_WIZARD_STEPS_BASE,
    KONSUMSI_STEPS,
    importTypes.includes("BARANG_KONSUMSI"),
    importTypes.includes("BAHAN_BAKU_INDUSTRI"),
  );
}

/** VKI's 14-step flow, per the updated Claude Design (isAppWizardStep1..14). */
export const VKI_WIZARD_STEPS: WizardStepMeta[] = [
  { key: "company", step: 1, title: "Company Information", subtitle: "Pilih perusahaan terdaftar", icon: Building2, implemented: true },
  { key: "application-info", step: 2, title: "Application Information", subtitle: "Type, category & reference", icon: Hash, implemented: true },
  { key: "legal", step: 3, title: "Legal Information", subtitle: "NIB, Akta, SK, KBLI", icon: FileText, implemented: true },
  { key: "tax", step: 4, title: "Tax Information", subtitle: "NPWP", icon: Banknote, implemented: true },
  { key: "location", step: 5, title: "Location Information", subtitle: "Lokasi perusahaan", icon: MapPin, implemented: true },
  { key: "support-document", step: 6, title: "Support Document", subtitle: "Upload dokumen pendukung", icon: FileStack, implemented: true },
  { key: "data-mesin", step: 7, title: "Data Mesin", subtitle: "Mesin produksi", icon: Cog, implemented: true },
  { key: "product-info", step: 8, title: "Product Information", subtitle: "Produk & bahan baku", icon: Package, implemented: true },
  { key: "capacity", step: 9, title: "Kapasitas", subtitle: "Izin & kapasitas terpasang", icon: Gauge, implemented: true },
  { key: "production-qty", step: 10, title: "Jumlah Produksi", subtitle: "Estimasi produksi", icon: Factory, implemented: true },
  { key: "raw-material-usage", step: 11, title: "Bahan Baku yang Digunakan", subtitle: "Penggunaan & stock", icon: Boxes, implemented: true },
  { key: "sales", step: 12, title: "Penjualan", subtitle: "Dalam & luar negeri", icon: ShoppingCart, implemented: true },
  { key: "preview", step: 13, title: "Preview", subtitle: "Tinjau sebelum submit", icon: Eye, implemented: true },
  { key: "submit", step: 14, title: "Submit", subtitle: "Kirim permohonan", icon: Send, implemented: true },
];

// Backward-compatible aliases — existing imports keep working (VIU is the default path).
export const WIZARD_STEPS = VIU_WIZARD_STEPS;
export const TOTAL_WIZARD_STEPS = VIU_WIZARD_STEPS.length;
export const IMPLEMENTED_WIZARD_STEPS = VIU_WIZARD_STEPS.filter((step) => step.implemented).length;
