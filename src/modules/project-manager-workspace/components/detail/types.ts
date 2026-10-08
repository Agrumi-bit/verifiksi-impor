import type { ApplicationLocationSummary } from "@/modules/shared/location-meta";

import type { ApplicationWizardValues } from "@/modules/applications/schema";
import type { DocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review";

export type PmApplicationDetail = {
  locationSummaries?: ApplicationLocationSummary[];
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  createdAt: string;
  submissionDate: string | null;
  payload: ApplicationWizardValues;
  businessAddress: string | null;
  company: { companyName: string; nibNumber: string; kbliEntries: { code: string; description: string }[]; sktNumber: string | null };
  stage: string;
  status: string;
  slaLabel: string;
  slaDetail: string;
  slaColor: string;
  assignments: {
    survey: {
      id: string;
      assignmentNumber: string;
      status: string;
      surveyorName: string | null;
      scheduledDate: string | null;
      location: string | null;
      letterStatus: string;
      letterNumber: string | null;
      letterReviewNote: string | null;
      pmReviewStatus: string | null;
      pmReviewNote: string | null;
      pmReviewedAt: string | null;
      allLocationsCompleted: boolean;
      locationVisits: {
        id: string;
        locationType: string;
        address: string;
        city: string | null;
        status: string;
        assignmentNumber: string;
        scheduledDate: string | null;
        submittedAt: string | null;
        /** Surveyor's Tanggal Kunjungan Aktual (YYYY-MM-DD). */
        surveyDate: string | null;
        /** Surveyor's Tanggal Penyusunan Laporan, else submittedAt for older reports. */
        completedAt: string | null;
        findingsCount: number;
        surveyorConclusion: string | null;
        decision: "VERIFIED" | "REJECTED" | "REVISION" | null;
        decisionNote: string | null;
        verifiedByName: string | null;
        verifiedAt: string | null;
      }[];
    } | null;
    dokumen: {
      id: string;
      assignmentNumber: string;
      status: string;
      verifikatorName: string | null;
      scheduledDate: string | null;
      location: string | null;
      letterStatus: string;
      letterNumber: string | null;
      letterReviewNote: string | null;
      pmReviewStatus: string | null;
      pmReviewNote: string | null;
      pmReviewedAt: string | null;
      validatedAt: string | null;
    } | null;
    technical: {
      id: string;
      assignmentNumber: string;
      status: string;
      technicalReviewerName: string | null;
      scheduledDate: string | null;
      location: string | null;
      letterStatus: string;
      letterNumber: string | null;
      letterReviewNote: string | null;
      pmReviewStatus: string | null;
      pmReviewNote: string | null;
      pmReviewedAt: string | null;
      validatedAt: string | null;
      technicalAnalysisData: Record<string, { status?: string; keterangan?: string; kesimpulan?: string; inputs?: Record<string, string> }>;
      /** Technical Analyst's review of the Laporan Verifikasi Dokumen. */
      documentReportReview?: DocumentReportReview | null;
    } | null;
  };
  documentChecklist: {
    key: string;
    label: string;
    category: string;
    documentPath: string | null;
    hasDocument: boolean;
    status: string;
    uploadedAt: string | null;
    verifiedByName: string | null;
    verifiedByRole: string | null;
    verifiedAt: string | null;
  }[];
  machines: {
    id: string;
    nama: string;
    proses: string;
    merk: string;
    model: string;
    tahun: string;
    quantity: string;
    quantitySatuan: string;
    kapasitas: string;
    kapasitasSatuan: string;
    kapasitasJam: string;
    kapasitasJamSatuan: string;
    waktuBeroperasi: string;
    kapasitasPerHari: string;
    kondisi: string;
    power: string;
    powerSatuan: string;
    input: string;
    output: string;
    photoMesinPath: string | null;
    status: string;
    note: string;
    verifiedAt: string | null;
  }[];
  products: {
    id: string;
    materialType: string;
    hsCode: string;
    hsDesc: string;
    deskripsi: string;
    kategori: string;
    status: string;
    note: string;
    verifiedAt: string | null;
    photoPath: string | null;
  }[];
  capacity: { id: string; jenisProduk: string; kbliCode: string; kbliDescription: string; berdasarkanIzin: string; kapasitasTerpasang: string; satuan: string }[];
  capacityDocumentPath: string | null;
  productionQty: { key: string; section: string; jenisProduk: string; hsCode: string; jumlah: string; satuan: string; status: string }[];
  rawMaterialUsage: { id: string; jenis: string; hsCode: string; productName: string; penggunaan: string; dataStock: string; rencanaKebutuhan: string; satuan: string }[];
  rawMaterialConversion: {
    id: string;
    productId: string | null;
    productName: string;
    productHsCode: string;
    jenis: string;
    hsCode: string;
    hsDesc: string;
    deskripsi: string;
    photoPath: string | null;
    kategori: string;
    volumeKebutuhanJumlah: string;
    volumeKebutuhanSatuan: string;
    volumeProduksiJumlah: string;
    volumeProduksiSatuan: string;
    rasioKonversi: string;
    keterangan: string;
  }[];
  sales: { id: string; productName: string; dalamNegeri: string; luarNegeri: string; satuan: string }[];
  /** VIU Jenis Impor — BAHAN_BAKU_INDUSTRI / BAHAN_BAKU_NON_INDUSTRI / BARANG_KONSUMSI. Empty for VKI. */
  importTypes?: string[];
  /** VIU per-scheme content (null for VKI) — see buildViuDetail in the PM application route. */
  viu?: PmViuDetail | null;
  timeline: { title: string; time: string }[];
};

export type PmProductDecision = { status: string; note: string; verifiedAt: string | null };

export type PmViuDetail = {
  partners: { partnerId: string; companyName: string; lhvki: string | null; hasLhvkiDocument: boolean }[];
  bahanBakuProducts: ({
    id: string;
    materialType: string;
    hsCode: string;
    hsDesc: string;
    estimatedVolume: string;
    volumeUnit: string;
    intendedUse: string;
    partnerIndustriId: string | null;
  } & PmProductDecision)[];
  konsumsi: {
    products: ({
      id: string;
      productName: string;
      brandId: string;
      brandName: string | null;
      hsCode: string;
      hsDescription: string | null;
      subKelompokKomoditas: string | null;
      originCountryNames: string[];
      quantity: number;
      stockQuantity: number;
      unit: string | null;
      averageUnitPrice: number;
      currency: string;
      total: number;
    } & PmProductDecision)[];
    totalsByCurrency: Record<string, number>;
    modalKerja: number | null;
  } | null;
  modalKerja: { bahanBaku: number | null; konsumsi: number | null } | null;
};
