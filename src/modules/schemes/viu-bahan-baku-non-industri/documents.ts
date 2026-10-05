import { financialEvidence, modalKerjaStatement } from "../shared/financial-documents";
import { viuCommonDocuments } from "../shared/viu-common-documents";
import type { SchemeDocumentDef } from "../types";
import { VIU_NON_INDUSTRI_LEGAL_BASIS as L } from "./legal-basis";

/** VIU Bahan Baku Non Industri — Permenperin 27/2025 Pasal 37 ayat (2) huruf b. */
export const VIU_NON_INDUSTRI_DOCUMENTS: readonly SchemeDocumentDef[] = [
  ...viuCommonDocuments(L),
  // Mitra Perusahaan Non Industri — new step, keys not produced by the app yet (Tahap 3).
  {
    id: "mitra-non-industri-kontrak",
    keyPatterns: ["nonindustri-partner:{partnerId}:contract"],
    label: "Kontrak Kerja Sama / Jual Beli dengan Perusahaan Non Industri",
    section: "mitra-non-industri",
    sifat: "WAJIB",
    legalBasis: L.kontrakNonIndustri,
    planned: true,
  },
  {
    id: "mitra-non-industri-nib",
    keyPatterns: ["nonindustri-partner:{partnerId}:nib"],
    label: "NIB Perusahaan Non Industri Mitra",
    section: "mitra-non-industri",
    sifat: "WAJIB",
    legalBasis: L.identitasMitra,
    planned: true,
  },
  modalKerjaStatement("nonindustri-support", L.modalKerja),
  ...financialEvidence("nonindustri-support", "PILIH_SALAH_SATU", L.buktiFinansial),
];
