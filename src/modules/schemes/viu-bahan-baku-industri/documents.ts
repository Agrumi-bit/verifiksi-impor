import { financialEvidence, modalKerjaStatement } from "../shared/financial-documents";
import { viuCommonDocuments } from "../shared/viu-common-documents";
import type { SchemeDocumentDef } from "../types";
import { VIU_INDUSTRI_LEGAL_BASIS as L } from "./legal-basis";

/** VIU Bahan Baku Industri — Permenperin 27/2025 Pasal 37 ayat (2) huruf a. */
export const VIU_INDUSTRI_DOCUMENTS: readonly SchemeDocumentDef[] = [
  ...viuCommonDocuments(L),
  // Mitra Perusahaan Industri ("Partner Industri" step)
  {
    id: "mitra-industri-kontrak",
    keyPatterns: ["partner:{partnerId}:contract"],
    label: "Kontrak Kerja Sama / Jual Beli dengan Perusahaan Industri",
    section: "mitra-industri",
    sifat: "WAJIB",
    legalBasis: L.kontrakIndustri,
    planned: true, // upload field added in Tahap 4
  },
  {
    id: "mitra-industri-lhvki",
    keyPatterns: ["partner:{partnerId}:lhvki"],
    label: "LHVKI Perusahaan Industri Mitra",
    section: "mitra-industri",
    sifat: "WAJIB",
    legalBasis: L.lhvkiMitra,
  },
  {
    id: "mitra-industri-nib",
    keyPatterns: ["partner:{partnerId}:nib"],
    label: "NIB Perusahaan Industri Mitra",
    section: "mitra-industri",
    sifat: "WAJIB",
    legalBasis: L.identitasMitra,
  },
  {
    id: "mitra-industri-npwp",
    keyPatterns: ["partner:{partnerId}:npwp"],
    label: "NPWP Perusahaan Industri Mitra",
    section: "mitra-industri",
    sifat: "WAJIB",
    legalBasis: L.dokumenMitraPendukung,
  },
  {
    id: "mitra-industri-sk",
    keyPatterns: ["partner:{partnerId}:sk"],
    label: "SK Kemenkumham Perusahaan Industri Mitra",
    section: "mitra-industri",
    sifat: "PENDUKUNG",
    legalBasis: L.dokumenMitraPendukung,
  },
  modalKerjaStatement("nonindustri-support", L.modalKerja),
  ...financialEvidence("nonindustri-support", "PILIH_SALAH_SATU", L.buktiFinansial),
];
