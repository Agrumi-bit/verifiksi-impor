import { z } from "zod";

import { fasilitasText, type ApplicationWizardValues } from "@/modules/applications/schema";
import { TAX_PROOF_TYPE_LABELS, type TaxProofType } from "@/modules/company/schema";
import { fileNameOf, fmtNum, mergeLhvki, tanggalId, type ProductionTable } from "@/modules/applications/vki-form/model";
import type { DocVerificationStatusValue } from "@/modules/verifikator-workspace/status";
import { deriveCompanyAge } from "@/modules/applications/company-age";

/**
 * "Form Pemeriksaan Kelengkapan Data dan Dokumen VKI" — Customer Relationship's administrative check
 * of a VKI application against Pasal 30 ayat (2) Permenperin 27/2025 (A. Identitas, B. Data, C. Dokumen,
 * D. Kekurangan, E. Kesimpulan). Ada/Tidak ada comes from the application itself and CR's own document
 * checks; Sesuai/Tidak sesuai of the data, the Pasal 25 basis and the tindak lanjut are CR's own input
 * (Application.crDataCheck, migration 45).
 */

export const VKI_DATA_ROWS = [
  { key: "1", label: "Data kemampuan produksi setiap mesin (jenis, merek, jumlah, kapasitas)", ref: "Pasal 30 ayat (2) huruf a angka 1" },
  { key: "2a", label: "Jumlah produksi per jenis dan pos tarif/HS, 1 tahun sebelumnya", ref: "Pasal 30 ayat (2) huruf a angka 2" },
  { key: "2b", label: "Penggunaan Tekstil/bahan penolong per jenis dan pos tarif/HS, 1 tahun sebelumnya", ref: "Pasal 30 ayat (2) huruf a angka 2" },
  { key: "3", label: "Konversi penggunaan bahan baku/bahan penolong per jenis produk", ref: "Pasal 30 ayat (2) huruf a angka 3" },
  { key: "4a", label: "Rencana produksi per jenis dan HS, 1 tahun ke depan", ref: "Pasal 30 ayat (2) huruf a angka 4" },
  { key: "4b", label: "Kebutuhan bahan baku/bahan penolong per jenis dan HS, 1 tahun ke depan", ref: "Pasal 30 ayat (2) huruf a angka 4" },
  { key: "5", label: "Penjualan dalam negeri dan tujuan ekspor per jenis dan HS, 1 tahun sebelumnya", ref: "Pasal 30 ayat (2) huruf a angka 5" },
  { key: "6", label: "Jumlah stok terkini per jenis dan HS", ref: "Pasal 30 ayat (2) huruf a angka 6" },
] as const;

export const TINDAK_LANJUT = ["LANJUT", "LENGKAPI", "DIKEMBALIKAN"] as const;
export const TINDAK_LANJUT_LABELS: Record<(typeof TINDAK_LANJUT)[number], string> = {
  LANJUT: "Lanjut ke verifikasi kesesuaian lapangan",
  LENGKAPI: "Pemohon diminta melengkapi/memperbaiki",
  DIKEMBALIKAN: "Dikembalikan",
};

export const crDataCheckSchema = z.object({
  items: z
    .record(z.string(), z.object({ sesuai: z.enum(["SESUAI", "TIDAK_SESUAI"]).nullable().default(null), note: z.string().trim().max(2000).default("") }))
    .default({}),
  dasarKewajiban: z.enum(["API_P", "KONTRAK_API_U"]).nullable().default(null),
  apiuMitra: z.string().trim().max(300).default(""),
  kontrak: z.string().trim().max(300).default(""),
  batasWaktu: z.string().trim().max(20).default(""),
  tindakLanjut: z.enum(TINDAK_LANJUT).nullable().default(null),
});
export type CrDataCheckInput = z.infer<typeof crDataCheckSchema>;
export type CrDataCheck = CrDataCheckInput & { updatedAt: string | null; updatedByName: string | null };

export function parseCrDataCheck(value: unknown): CrDataCheck {
  const parsed = crDataCheckSchema.safeParse(value ?? {});
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const base = parsed.success ? parsed.data : crDataCheckSchema.parse({});
  return {
    ...base,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    updatedByName: typeof raw.updatedByName === "string" ? raw.updatedByName : null,
  };
}

export type CheckDoc = {
  key: string;
  label: string;
  documentPath: string | null;
  lengkap: boolean;
  status: DocVerificationStatusValue;
  rejectionNote: string;
  requestNote: string;
  /** CR's "Belum Tersedia" mark. */
  unavailable?: boolean;
  unavailableNote?: string;
};

export type VkiCheckDataRow = { key: string; label: string; ref: string; ada: boolean; summary: string; sesuai: "SESUAI" | "TIDAK_SESUAI" | null; note: string };
export type VkiCheckDocRow = {
  key: string;
  label: string;
  ref: string;
  ada: boolean | null;
  isian: string;
  /** CR's document check across the mapped checklist documents. */
  checkStatus: DocVerificationStatusValue | null;
  note: string;
  docs: { label: string; path: string }[];
  /** Shown above the document links (6b: milik sendiri / kerja sama). */
  keterangan?: string;
  sub?: boolean;
};

export type VkiCheck = {
  identity: [string, string][];
  identityComplete: boolean;
  jenisPermohonan: "BARU" | "PERUBAHAN";
  dataRows: VkiCheckDataRow[];
  docRows: VkiCheckDocRow[];
  electricity: { docKey: string; bulan: string; nominal: string; kwh: string; sesuai: boolean | null; note: string }[];
  companyAge: "OVER_3" | "UNDER_3" | null;
  /** True when the age wasn't stated on the application but follows from the NIB's issue date. */
  companyAgeDerived: boolean;
  taxRows: { year: string; jenis: string; nomorTanggal: string; ada: boolean; note: string }[];
  skt: { nomor: string; tanggal: string; penerbit: string; sesuaiNpwp: boolean | null };
  tenagaKerja: { kategori: string; jumlah: string }[];
  /** Lampiran Data Aspek Produksi — the application's production tables (B.1–B.6). */
  production: ProductionTable[];
  check: CrDataCheck;
};

const t = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const has = (v: unknown) => Boolean(t(v)) && Number(String(v).replace(/\./g, "").replace(",", ".")) !== 0;
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const bulanId = (v: string | undefined) => {
  const m = /^(\d{4})-(\d{2})/.exec(v ?? "");
  return m ? `${BULAN[Number(m[2]) - 1]} ${m[1]}` : t(v);
};

function address(loc: Record<string, unknown> | undefined): string {
  if (!loc) return "";
  return ["address", "addressDesa", "addressKecamatan", "city", "province"].map((k) => t(loc[k])).filter(Boolean).join(", ");
}

/** Worst CR status across a row's documents (Tidak Valid > Perlu Revisi > Belum Diperiksa > Valid > Tidak Diperlukan). */
function combinedStatus(docs: CheckDoc[]): DocVerificationStatusValue | null {
  if (docs.length === 0) return null;
  const order: DocVerificationStatusValue[] = ["REJECTED", "NEED_REVISION", "PENDING", "VALID", "NOT_APPLICABLE"];
  for (const s of order) if (docs.some((d) => d.status === s)) return s;
  return null;
}

export function buildVkiCheck({
  payload: p,
  applicationNumber,
  submissionDate,
  category,
  documents,
  lhvki,
  saved,
  production = [],
}: {
  payload: ApplicationWizardValues;
  applicationNumber: string;
  submissionDate: string;
  category: string;
  documents: CheckDoc[];
  lhvki: { number: string; issuedAt: string; issuer: string }[];
  saved: CrDataCheck;
  production?: ProductionTable[];
}): VkiCheck {
  const rekamJejak = mergeLhvki(lhvki, p);
  const locations = (p.locations ?? []) as unknown as Record<string, unknown>[];
  const kantor = locations.find((l) => l.locationType === "KANTOR");
  const pabrik = locations.filter((l) => l.locationType === "PABRIK");
  const kbli = (p.kbliEntries ?? []).map((e) => `${e.code}${e.description ? ` (${e.description})` : ""}`).join("; ");
  const pimpinan = [t(p.contactFullName), t(p.contactDesignation)].filter(Boolean).join(", ");
  const dasar = saved.dasarKewajiban ?? (t(p.companyApiType) === "API-P" ? "API_P" : null);
  const box = (on: boolean) => (on ? "☒" : "☐");
  const jenisPermohonan = category === "NEW" ? "BARU" : "PERUBAHAN";

  const identity: [string, string][] = [
    ["Nomor permohonan (SIINas)", applicationNumber],
    ["Tanggal permohonan diterima LPV", tanggalId(submissionDate)],
    ["Jenis permohonan", `${box(jenisPermohonan === "BARU")} VKI baru\n${box(jenisPermohonan === "PERUBAHAN")} Perubahan nama/alamat (Pasal 33–35)`],
    [
      "Dasar kewajiban VKI (Pasal 25)",
      `${box(dasar === "API_P")} Perusahaan API-P pengimpor bahan baku/penolong\n${box(dasar === "KONTRAK_API_U")} Perusahaan Industri berkontrak dengan Perusahaan API-U`,
    ],
    ["Nama perusahaan industri", t(p.companyName)],
    ["Nomor Induk Berusaha (NIB)", t(p.nibNumber)],
    ["NPWP", t(p.npwpNumber)],
    ["KBLI / bidang usaha", kbli],
    ["Alamat kantor", address(kantor)],
    ["Alamat pabrik/lokasi produksi", pabrik.map(address).filter(Boolean).join("\n")],
    ["Pimpinan perusahaan (setingkat direktur)", pimpinan],
    ["Fasilitas kepabeanan", fasilitasText(p) || "Belum diisi pada permohonan"],
    ["Perusahaan API-U mitra kontrak (jika ada)", saved.apiuMitra],
    ["Nama dan nomor kontrak", saved.kontrak],
    [
      "LHVKI sebelumnya (jika ada)",
      rekamJejak.length
        ? rekamJejak
            .map((l) =>
              [l.number || "tanpa nomor", l.issuedAt && `terbit ${tanggalId(l.issuedAt)}`, l.validUntil && `berlaku s.d. ${tanggalId(l.validUntil)}`, l.issuer]
                .filter(Boolean)
                .join(", "),
            )
            .join("\n")
        : "Tidak ada",
    ],
  ];
  const identityComplete = Boolean(t(p.companyName) && t(p.nibNumber) && t(p.npwpNumber) && kbli && address(kantor) && pabrik.length && pimpinan);

  // ---- B. data (from the application itself)
  const machines = (p.machines ?? []).filter((m) => t(m.nama));
  const pq = p.productionQty ?? [];
  const usage = p.rawMaterialUsage ?? [];
  const conv = (p.rawMaterialConversions ?? []).filter((c) => t(c.rasioKonversi) || t(c.volumeKebutuhanJumlah));
  const sales = (p.sales ?? []).filter((s) => has(s.dalamNegeri) || has(s.luarNegeri));
  const presence: Record<string, [boolean, string]> = {
    "1": [machines.length > 0, `${machines.length} jenis mesin`],
    "2a": [pq.some((r) => has(r.perTahunSebelumnya)), `${pq.filter((r) => has(r.perTahunSebelumnya)).length} produk`],
    "2b": [usage.some((u) => has(u.penggunaan)), `${usage.filter((u) => has(u.penggunaan)).length} bahan baku`],
    "3": [conv.length > 0, `${conv.length} konversi`],
    "4a": [pq.some((r) => has(r.perTahunRencana)), `${pq.filter((r) => has(r.perTahunRencana)).length} produk`],
    "4b": [
      usage.some((u) => has(u.rencanaKebutuhanDalamNegeri) || has(u.rencanaKebutuhanLuarNegeri) || has(u.rencanaKebutuhan)),
      `${usage.filter((u) => has(u.rencanaKebutuhanDalamNegeri) || has(u.rencanaKebutuhanLuarNegeri) || has(u.rencanaKebutuhan)).length} bahan baku`,
    ],
    "5": [sales.length > 0, `${sales.length} produk`],
    "6": [usage.some((u) => t(u.dataStock) !== ""), `${usage.filter((u) => t(u.dataStock) !== "").length} bahan baku`],
  };
  const dataRows: VkiCheckDataRow[] = VKI_DATA_ROWS.map((r) => ({
    ...r,
    ada: presence[r.key][0],
    summary: presence[r.key][0] ? presence[r.key][1] : "",
    sesuai: saved.items[r.key]?.sesuai ?? null,
    note: saved.items[r.key]?.note ?? "",
  }));

  // ---- C. documents (CR's own document checklist)
  const pick = (pred: (d: CheckDoc) => boolean) => documents.filter(pred);
  const docRow = (key: string, label: string, ref: string, docs: CheckDoc[], extra?: Partial<VkiCheckDocRow>): VkiCheckDocRow => {
    const present = docs.filter((d) => d.lengkap && d.documentPath && !d.unavailable);
    return {
      key,
      label,
      ref,
      ada: present.length > 0,
      isian: present.map((d) => fileNameOf(d.documentPath)).join("; "),
      checkStatus: combinedStatus(docs),
      note: docs
        .map((d) => [d.unavailable && `Belum tersedia${d.unavailableNote ? `: ${d.unavailableNote}` : ""}`, d.rejectionNote, d.requestNote].filter(Boolean).join(" — "))
        .filter(Boolean)
        .join("; "),
      docs: present.map((d) => ({ label: d.label, path: d.documentPath! })),
      ...extra,
    };
  };
  const npwpDocs = pick((d) => d.key === "npwp");
  const nibDocs = pick((d) => d.key === "nib" || d.key === "kbli-utama");
  const taxDocs = pick((d) => d.key === "tax-proof-summary" || d.key === "skt" || d.key.startsWith("tax-support:"));
  const listrik = pick((d) => d.key.startsWith("vki-support:listrik:"));
  const gudang = locations.filter((l) => l.locationType === "GUDANG");
  const docRows: VkiCheckDocRow[] = [
    docRow("1", "Nomor Pokok Wajib Pajak (NPWP)", "Pasal 30 ayat (2) huruf b angka 1", npwpDocs, {
      isian: [t(p.npwpNumber), ...npwpDocs.filter((d) => d.documentPath).map((d) => fileNameOf(d.documentPath))].filter(Boolean).join("; "),
    }),
    docRow("2", "Perizinan Berusaha (NIB dan izin/standar usaha industri yang berlaku)", "Pasal 30 ayat (2) huruf b angka 2", nibDocs, {
      isian: [t(p.nibNumber) && `NIB ${t(p.nibNumber)}`, ...nibDocs.filter((d) => d.documentPath).map((d) => fileNameOf(d.documentPath))].filter(Boolean).join("; "),
    }),
    docRow("3", "Data tenaga kerja", "Pasal 30 ayat (2) huruf b angka 3", pick((d) => d.key === "vki-support:tenaga-kerja")),
    {
      key: "4",
      label: "Data mesin dan peralatan produksi",
      ref: "Pasal 30 ayat (2) huruf b angka 4",
      ada: machines.length > 0,
      isian: machines.length ? `${machines.length} jenis mesin diisi pada sistem` : "",
      checkStatus: null,
      note: "",
      docs: [],
    },
    docRow("5", "Gambar alur proses produksi", "Pasal 30 ayat (2) huruf b angka 5", pick((d) => d.key === "vki-support:gambar-alur-proses" || d.key === "vki-support:alur-proses")),
    docRow(
      "6",
      "Surat pernyataan bermeterai, ditandatangani pimpinan setingkat direktur, sesuai format Lampiran II",
      "Pasal 30 ayat (2) huruf b angka 6; Lampiran II huruf G",
      pick((d) => d.key === "vki-support:memiliki-menguasai" || d.key.startsWith("vki-support:unit-limbah")),
    ),
    {
      key: "6a",
      label: "Menyatakan memiliki/menguasai gudang bahan baku dan/atau hasil produksi",
      ref: "Pasal 30 ayat (2) huruf b angka 6 huruf a; Lampiran II huruf G",
      ada: null,
      isian: gudang.length ? `${gudang.length} lokasi gudang terdaftar` : "",
      checkStatus: null,
      note: "",
      docs: [],
      sub: true,
    },
    {
      ...docRow(
        "6b",
        "Menyatakan memiliki unit pengolahan limbah atau bekerja sama dengan pihak lain",
        "Pasal 30 ayat (2) huruf b angka 6 huruf b; Lampiran II huruf G",
        pick((d) => d.key.startsWith("vki-support:unit-limbah")),
      ),
      ...(() => {
        const limbah = (p.vkiSupportDocs ?? []).find((d) => d.key === "unit-limbah");
        const opsi = limbah?.opsi === "KERJA_SAMA" ? "Kerja sama dengan pihak lain" : limbah?.opsi === "MILIK_SENDIRI" ? "Milik sendiri" : "";
        return opsi ? { keterangan: opsi, isian: opsi } : {};
      })(),
      ada: null,
      sub: true,
    },
    docRow(
      "7",
      "Bukti pembayaran pajak 3 tahun terakhir, atau surat keterangan terdaftar pajak bila Perizinan Berusaha kurang dari 3 tahun",
      "Pasal 30 ayat (2) huruf b angka 7",
      taxDocs.filter((d) => d.status !== "NOT_APPLICABLE" || d.lengkap),
    ),
    docRow("8", "Bukti pembayaran listrik 3 bulan sebelumnya", "Pasal 30 ayat (2) huruf b angka 8", listrik, {
      isian: listrik.filter((d) => d.documentPath).length ? `${listrik.filter((d) => d.documentPath).length} bulan` : "",
    }),
  ];

  const electricity = (p.electricityMonths ?? []).map((m) => {
    const doc = listrik.find((d) => d.key === `vki-support:listrik:${m.id}`);
    return {
      docKey: `vki-support:listrik:${m.id}`,
      bulan: bulanId(m.bulan),
      nominal: t(m.nominal) ? fmtNum(m.nominal) : "",
      kwh: fmtNum(m.kwh),
      sesuai: doc ? (doc.unavailable || doc.status === "REJECTED" ? false : doc.status === "VALID" ? true : null) : null,
      note: doc ? [doc.unavailable && `Belum tersedia${doc.unavailableNote ? `: ${doc.unavailableNote}` : ""}`, doc.rejectionNote, doc.requestNote].filter(Boolean).join(" — ") : "",
    };
  });

  const taxRows = (p.taxProofs ?? []).map((tp) => ({
    year: tp.year,
    jenis: tp.type ? TAX_PROOF_TYPE_LABELS[tp.type as TaxProofType] : "",
    nomorTanggal: [t(tp.nomor), tanggalId(tp.tanggal)].filter(Boolean).join(", "),
    ada: Boolean(t(tp.docPath)),
    note: "",
  }));
  const sktDoc = documents.find((d) => d.key === "skt");
  return {
    identity,
    identityComplete,
    jenisPermohonan,
    dataRows,
    docRows,
    electricity,
    companyAge: p.companyAge ?? deriveCompanyAge(p.nibIssueDate, submissionDate),
    companyAgeDerived: !p.companyAge && Boolean(deriveCompanyAge(p.nibIssueDate, submissionDate)),
    taxRows,
    skt: {
      nomor: t(p.sktNumber),
      tanggal: tanggalId(p.sktDate),
      penerbit: t(p.sktIssuer),
      sesuaiNpwp: sktDoc ? (sktDoc.status === "VALID" ? true : sktDoc.status === "REJECTED" ? false : null) : null,
    },
    tenagaKerja: (p.tenagaKerjaEntries ?? []).filter((e) => t(e.kategori) || t(e.jumlah)).map((e) => ({ kategori: t(e.kategori), jumlah: fmtNum(e.jumlah) })),
    production,
    check: { ...saved, dasarKewajiban: dasar },
  };
}

export type VkiCheckDeficiency = { item: string; tindakLanjut: string };

/** D. Daftar kekurangan — data Tidak ada / Tidak sesuai and documents Tidak ada / Tidak Valid. */
export function vkiCheckDeficiencies(c: VkiCheck): VkiCheckDeficiency[] {
  const out: VkiCheckDeficiency[] = [];
  for (const r of c.dataRows) {
    if (!r.ada) out.push({ item: `Data B.${r.key} — ${r.label} (tidak ada)`, tindakLanjut: r.note || "Pemohon diminta mengisi data pada SIINas/sistem." });
    else if (r.sesuai === "TIDAK_SESUAI") out.push({ item: `Data B.${r.key} — ${r.label} (tidak sesuai)`, tindakLanjut: r.note || "Pemohon diminta memperbaiki data agar sesuai dokumen pendukung." });
  }
  for (const r of c.docRows) {
    if (r.sub) continue;
    if (r.ada === false) out.push({ item: `Dokumen C.${r.key} — ${r.label} (tidak ada)`, tindakLanjut: r.note || "Pemohon diminta mengunggah dokumen." });
    else if (r.checkStatus === "REJECTED" || r.checkStatus === "NEED_REVISION")
      out.push({ item: `Dokumen C.${r.key} — ${r.label} (tidak valid)`, tindakLanjut: r.note || "Pemohon diminta memperbaiki dokumen." });
  }
  return out;
}

/** E. Kesimpulan pemeriksaan administrasi. */
export function vkiCheckConclusion(c: VkiCheck) {
  const dataLengkap = c.dataRows.every((r) => r.ada);
  const dokumenLengkap = c.docRows.filter((r) => !r.sub).every((r) => r.ada !== false);
  const konsisten =
    !c.dataRows.some((r) => r.sesuai === "TIDAK_SESUAI") && !c.docRows.some((r) => r.checkStatus === "REJECTED" || r.checkStatus === "NEED_REVISION");
  const suggested: (typeof TINDAK_LANJUT)[number] = c.identityComplete && dataLengkap && dokumenLengkap && konsisten ? "LANJUT" : "LENGKAPI";
  return { identitasLengkap: c.identityComplete, dataLengkap, dokumenLengkap, konsisten, suggested, tindakLanjut: c.check.tindakLanjut ?? suggested, tindakLanjutDipilih: c.check.tindakLanjut != null };
}
