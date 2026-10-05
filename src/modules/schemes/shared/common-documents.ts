import type { DocumentSifat, LegalBasis, ReportSectionId, SchemeDocumentDef, SchemeLocationType } from "../types";

/**
 * Documents every scheme collects from the company profile / location steps. Only the
 * identity (id, key patterns, label, section) is shared — sifat and legal basis are NOT,
 * each scheme's documents.ts sets its own via `common()`. This is deliberate: the same NPWP
 * file is "Pasal 30 ayat (2) huruf b angka 1" in VKI and "Pasal 37 ayat (2) huruf c angka 2
 * huruf a)" in VIU Konsumsi.
 */
type CommonBase = Pick<SchemeDocumentDef, "id" | "keyPatterns" | "label" | "section" | "locationTypes">;

function base(
  id: string,
  keyPatterns: string[],
  label: string,
  section: ReportSectionId,
  locationTypes?: SchemeLocationType[],
): CommonBase {
  return { id, keyPatterns, label, section, locationTypes };
}

const LOCATION_LABEL: Record<SchemeLocationType, string> = {
  KANTOR: "Kantor",
  GUDANG: "Gudang",
  PABRIK: "Pabrik",
};

function locationTenure(type: SchemeLocationType): CommonBase {
  return base(
    `location-tenure-${type.toLowerCase()}`,
    ["location:{locationId}:ownership:{docType}", "location:{locationId}:lease:{docType}"],
    `Bukti Kepemilikan / Perjanjian Sewa ${LOCATION_LABEL[type]}`,
    "lokasi",
    [type],
  );
}

export const COMMON_DOCUMENTS = {
  nib: base("nib", ["nib"], "Nomor Induk Berusaha (NIB) / Perizinan Berusaha", "legalitas"),
  kbliUtama: base("kbli-utama", ["kbli-utama"], "KBLI Utama", "legalitas"),
  kbliPendukung: base("kbli-pendukung", ["kbli-pendukung"], "KBLI Pendukung", "legalitas"),
  aktaPendirian: base("notarial", ["notarial"], "Akta Pendirian Perusahaan", "legalitas"),
  aktaPerubahan: base("notarial-amendment", ["notarial-amendment"], "Akta Perubahan Anggaran Dasar", "legalitas"),
  skKemenkumham: base("sk", ["sk"], "SK Pengesahan Kemenkumham", "legalitas"),
  npwp: base("npwp", ["npwp"], "Nomor Pokok Wajib Pajak (NPWP)", "perpajakan"),
  buktiPajak3Tahun: base("tax-proof-summary", ["tax-proof-summary"], "Bukti Pembayaran Pajak 3 (Tiga) Tahun Terakhir", "perpajakan"),
  rincianBuktiPajak: base("tax-support", ["tax-support:{type}"], "Rincian Bukti Pembayaran Pajak", "perpajakan"),
  suratKeteranganFiskal: base("tax-support-skf", ["tax-support:skf"], "Surat Keterangan Fiskal", "perpajakan"),
  skt: base("skt", ["skt"], "Surat Keterangan Terdaftar (SKT) Pajak", "perpajakan"),
  tenureKantor: locationTenure("KANTOR"),
  tenureGudang: locationTenure("GUDANG"),
  tenurePabrik: locationTenure("PABRIK"),
  tandaDaftarGudang: base(
    "warehouse-registration",
    ["location:{locationId}:warehouseRegistration"],
    "Tanda Daftar Gudang / SK Penetapan Gudang Berikat / TPS",
    "lokasi",
    ["GUDANG"],
  ),
  layoutGudang: base("warehouse-layout", ["location:{locationId}:warehouseLayout"], "Layout Gudang", "lokasi", ["GUDANG"]),
} as const satisfies Record<string, CommonBase>;

/** Attach a scheme's own sifat + legal basis to a shared document identity. */
export function common(
  doc: CommonBase,
  sifat: DocumentSifat,
  legalBasis: LegalBasis,
  extra: Partial<Pick<SchemeDocumentDef, "group" | "label" | "planned">> = {},
): SchemeDocumentDef {
  return { ...doc, sifat, legalBasis, ...extra };
}
