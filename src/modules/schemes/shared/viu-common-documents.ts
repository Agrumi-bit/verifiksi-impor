import { COMMON_DOCUMENTS as C, common } from "./common-documents";
import type { SchemeDocumentDef } from "../types";
import type { ViuLegalBasis } from "./viu-legal";

/**
 * Company-level documents in a VIU scheme, with THAT scheme's citations (built by viuLegalBasis).
 * Decisions (confirmed by user, 2026-10): bukti pajak 3 th / SKT = Pendukung for VIU;
 * layout gudang = Pendukung (not in Pasal 37); Pabrik is not a VIU location.
 */
export function viuCommonDocuments(L: ViuLegalBasis): SchemeDocumentDef[] {
  return [
    common(C.nib, "WAJIB", L.perizinanBerusaha),
    common(C.kbliUtama, "WAJIB", L.kbli),
    common(C.kbliPendukung, "PENDUKUNG", L.kbli),
    common(C.aktaPendirian, "PENDUKUNG", L.akta),
    common(C.aktaPerubahan, "PENDUKUNG_JIKA_ADA", L.akta),
    common(C.skKemenkumham, "PENDUKUNG", L.akta),
    common(C.npwp, "WAJIB", L.npwp),
    common(C.buktiPajak3Tahun, "PENDUKUNG", L.pajak),
    common(C.skt, "PENDUKUNG", L.pajak),
    common(C.rincianBuktiPajak, "PENDUKUNG", L.pajak),
    common(C.suratKeteranganFiskal, "PENDUKUNG_JIKA_ADA", L.pajak),
    common(C.tenureKantor, "WAJIB", L.kantor),
    common(C.tenureGudang, "WAJIB", L.gudang),
    common(C.tandaDaftarGudang, "WAJIB", L.tandaDaftarGudang),
    common(C.layoutGudang, "PENDUKUNG", L.layoutGudang),
  ];
}
