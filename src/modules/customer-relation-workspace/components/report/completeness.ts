import type { DocVerificationStatusValue } from "../../status";

export type CompletenessDoc = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
  lengkap: boolean;
  status: DocVerificationStatusValue;
  rejectionNote: string;
  requestNote: string;
  version: number;
  uploadedAt: string | null;
};

/** Counts behind CR's Laporan Kelengkapan Dokumen (same rules as the Kelengkapan Dokumen tab). */
export function completenessStats(docs: readonly CompletenessDoc[]) {
  return {
    total: docs.length,
    tersedia: docs.filter((d) => d.lengkap).length,
    kurang: docs.filter((d) => !d.lengkap && d.status !== "NOT_APPLICABLE").length,
    valid: docs.filter((d) => d.status === "VALID").length,
    tidakValid: docs.filter((d) => d.status === "REJECTED" || d.status === "NEED_REVISION").length,
    tidakDiperlukan: docs.filter((d) => d.status === "NOT_APPLICABLE").length,
    belumDiperiksa: docs.filter((d) => d.status === "PENDING").length,
    reviewed: docs.filter((d) => d.status !== "PENDING").length,
  };
}

/**
 * LENGKAP — every document is either Tidak Diperlukan or uploaded and Valid.
 * BELUM LENGKAP — something is missing or Tidak Valid. Otherwise the check is still running.
 */
export function completenessVerdict(docs: readonly CompletenessDoc[]): { key: "LENGKAP" | "BELUM_LENGKAP" | "BELUM_SELESAI"; label: string; text: string } {
  const s = completenessStats(docs);
  if (s.kurang > 0 || s.tidakValid > 0) {
    return {
      key: "BELUM_LENGKAP",
      label: "BELUM LENGKAP",
      text: `Dokumen permohonan belum lengkap: ${s.kurang} dokumen belum diunggah dan ${s.tidakValid} dokumen dinyatakan tidak valid. Perusahaan perlu melengkapi/memperbaiki dokumen sebagaimana tercantum pada bagian IV sebelum permohonan diproses lebih lanjut.`,
    };
  }
  if (s.belumDiperiksa > 0) {
    return {
      key: "BELUM_SELESAI",
      label: "PEMERIKSAAN BELUM SELESAI",
      text: `Seluruh dokumen telah diunggah, namun ${s.belumDiperiksa} dokumen belum diperiksa oleh Customer Relationship.`,
    };
  }
  return {
    key: "LENGKAP",
    label: "LENGKAP",
    text: "Seluruh dokumen persyaratan telah tersedia dan dinyatakan valid secara administratif, sehingga permohonan dapat diteruskan ke tahap penugasan/verifikasi.",
  };
}
