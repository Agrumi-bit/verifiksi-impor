import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { MACHINE_KONDISI_LABELS } from "@/modules/applications/schema";
import { TAX_PROOF_TYPE_LABELS, type TaxProofType } from "@/modules/company/schema";
import { splitKbliEntries, type LocationValues } from "@/modules/shared/schema";
import {
  buildCapacityRows,
  buildMachineChecklist,
  buildProductionQtyChecklist,
  buildRawMaterialConversionRows,
  buildRawMaterialUsageChecklist,
  buildSalesChecklist,
} from "@/modules/verifikator-workspace/schema";

/**
 * "Formulir Permohonan VKI" — the application rendered in the format of the official request
 * form (Permenperin 27/2025 Pasal 30 ayat (1) dan (2)): A. Data Pemohon … G. Pernyataan plus the
 * Lampiran surat pernyataan. One neutral block model, drawn by both the A4 page (Cetak / Unduh
 * PDF) and the Word (.docx) export, so the two never drift apart.
 */
export type VkiFormBlock =
  | { kind: "title"; lines: string[] }
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "para"; text: string; italic?: boolean; bold?: boolean; align?: "left" | "center" | "justify" }
  | { kind: "fields"; rows: [string, string][] }
  | { kind: "table"; headers: string[]; widths: number[]; rows: string[][]; numeric?: number[]; center?: number[] }
  | { kind: "sign"; dateLine: string; role: string; note: string; name: string }
  | { kind: "pagebreak" };

export type VkiForm = {
  applicationNumber: string;
  companyName: string;
  kopLines: string[];
  blocks: VkiFormBlock[];
};

export type VkiFormLhvki = { number: string; issuedAt: string; issuer: string };

export type VkiFormSource = {
  payload: ApplicationWizardValues;
  applicationNumber: string;
  /** Effective "Tanggal Pengajuan" (ISO). */
  submissionDate: string | null;
  /** LHVKI the company already holds (earlier VKI applications). */
  lhvki: VkiFormLhvki[];
};

const LEMBAGA = "PT Tribhakti Inspektama";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BOX_ON = "☒";
const BOX_OFF = "☐";
const DASH = "—";

const t = (value: unknown): string => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const orDash = (value: unknown) => t(value) || DASH;
const box = (on: boolean) => (on ? BOX_ON : BOX_OFF);

/** System numbers ("25.920.000", "85824", "1555.2000000000003") printed id-ID. */
export function fmtNum(value: unknown): string {
  const s = t(value);
  if (!s) return "";
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return s;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s).toLocaleString("id-ID", { maximumFractionDigits: 4 });
  return s;
}

/** "2026-07-16" / ISO → "16 Juli 2026". */
export function tanggalId(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!m) return "";
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? ""} ${m[1]}`;
}

/** "2026-04" → "April 2026". */
function bulanId(value: string | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(value ?? "");
  return m ? `${BULAN[Number(m[2]) - 1] ?? ""} ${m[1]}` : t(value);
}

/** The stored path's file name ("uploads/x/171234-03.DATA TENAGA KERJA.pdf" → "03.DATA TENAGA KERJA.pdf"). */
export function fileNameOf(path: string | undefined | null): string {
  const s = t(path);
  if (!s) return "";
  const base = decodeURIComponent(s.split("?")[0].split("/").pop() ?? s);
  return base.replace(/^\d{10,}[-_]/, "");
}

function fullAddress(loc: Partial<LocationValues> | undefined): string {
  if (!loc) return "";
  return [loc.address, loc.addressDesa, loc.addressKecamatan, loc.city, loc.province, loc.postalCode]
    .map((part) => t(part))
    .filter(Boolean)
    .join(", ");
}

const BUILDING_LABEL: Record<string, string> = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" };
const LOCATION_LABEL: Record<string, string> = { KANTOR: "Kantor", PABRIK: "Pabrik", GUDANG: "Gudang" };

export function buildVkiForm({ payload, applicationNumber, submissionDate, lhvki }: VkiFormSource): VkiForm {
  const p = payload;
  const blocks: VkiFormBlock[] = [];
  const add = (b: VkiFormBlock) => blocks.push(b);

  const locations = (p.locations ?? []) as Partial<LocationValues>[];
  const kantor = locations.filter((l) => l.locationType === "KANTOR");
  const pabrik = locations.filter((l) => l.locationType === "PABRIK");
  const gudang = locations.filter((l) => l.locationType === "GUDANG");
  const kbli = splitKbliEntries(p.kbliEntries ?? []);
  const kbliText = [...kbli.utama, ...kbli.pendukung].map((e) => `${e.code}${e.description ? ` (${e.description})` : ""}`).join("; ");
  const tenagaKerja = (p.tenagaKerjaEntries ?? []).reduce((sum, e) => sum + (Number(String(e.jumlah ?? "").replace(/\./g, "")) || 0), 0);
  const companyName = t(p.companyName) || DASH;
  const pemohon = t(p.contactFullName);
  const jabatan = t(p.contactDesignation);
  const contact = [pemohon && `${pemohon}${jabatan ? ` (${jabatan})` : ""}`, t(p.contactPhone), t(p.contactEmail)].filter(Boolean).join(", ");
  const kantorAddress = fullAddress(kantor[0]);
  const supportDoc = (key: string) => (p.vkiSupportDocs ?? []).find((d) => d.key === key);
  const kota = t(kantor[0]?.city) || "………………";
  const tanggal = tanggalId(submissionDate) || "……… ………………… 20……";

  // ---- Kop + pembuka
  add({ kind: "title", lines: ["FORMULIR PERMOHONAN VERIFIKASI KEMAMPUAN INDUSTRI (VKI)", "(Perusahaan Industri)"] });
  add({
    kind: "para",
    italic: true,
    align: "center",
    text: "Berdasarkan Peraturan Menteri Perindustrian Republik Indonesia Nomor 27 Tahun 2025 tentang Tata Cara Penerbitan Pertimbangan Teknis Impor Tekstil dan Produk Tekstil, Pasal 30 ayat (1) dan ayat (2).",
  });
  add({ kind: "para", align: "left", text: `Kepada Yth.\nLembaga Pelaksana Verifikasi\n${LEMBAGA}\nmelalui SIINas` });
  add({ kind: "para", text: "Dengan ini kami mengajukan permohonan Verifikasi Kemampuan Industri (VKI) dengan data dan dokumen sebagai berikut:" });

  // ---- A. Data Pemohon
  add({ kind: "heading", text: "A. DATA PEMOHON" });
  const pabrikRows: [string, string][] = (pabrik.length ? pabrik : [undefined]).map((loc, i) => [
    `Alamat Pabrik${pabrik.length > 1 ? ` ${i + 1}` : ""}`,
    fullAddress(loc) || DASH,
  ]);
  const aRows: [string, string][] = [
    ["Nama Perusahaan", companyName],
    ["Nomor Induk Berusaha (NIB)", orDash(p.nibNumber)],
    ["Nomor Pokok Wajib Pajak (NPWP)", orDash(p.npwpNumber)],
    ["Perizinan Berusaha (PB-Sektor Industri)", t(p.nibNumber) ? `NIB ${t(p.nibNumber)}` : DASH],
    ["KBLI (KBLI 2020)", kbliText || DASH],
    ["Jenis Pemohon", `${BOX_ON} Perusahaan Industri   ${BOX_OFF} Perusahaan API-P`],
    ["Alamat Kantor", kantorAddress || DASH],
    ...pabrikRows,
    ["Nama Pemohon / Penanggung Jawab", pemohon || DASH],
    ["Jabatan Pemohon", jabatan || DASH],
    ["Contact Person", contact || DASH],
    ["Email Perusahaan", orDash(p.companyEmail)],
    ["Jumlah Tenaga Kerja (semester tahun berjalan)", tenagaKerja ? `${tenagaKerja.toLocaleString("id-ID")} orang` : DASH],
    ["Rekam jejak LHVKI sebelumnya", `${box(lhvki.length > 0)} Pernah${lhvki.length ? " (rincian di bawah tabel)" : ""}   ${box(lhvki.length === 0)} Belum pernah`],
  ];
  add({ kind: "fields", rows: aRows.map(([k, v], i) => [`${i + 1}. ${k}`, v]) });
  if (lhvki.length > 0) {
    add({ kind: "para", text: "Rekam jejak LHVKI yang dimiliki perusahaan:" });
    add({
      kind: "table",
      headers: ["No", "Nomor LHVKI", "Tanggal", "Penerbit"],
      widths: [8, 40, 22, 30],
      rows: lhvki.map((l, i) => [`${i + 1}.`, l.number, tanggalId(l.issuedAt), l.issuer]),
    });
  }

  // ---- B. Lokasi dan kapasitas
  add({ kind: "heading", text: "B. DATA LOKASI DAN KAPASITAS PERIZINAN" });
  add({ kind: "subheading", text: "1) Lokasi kantor, pabrik, dan gudang" });
  const penguasaan = locations
    .filter((l) => l.buildingStatus)
    .map((l) => `${LOCATION_LABEL[l.locationType ?? ""] ?? l.locationType}: ${BUILDING_LABEL[l.buildingStatus ?? ""] ?? l.buildingStatus}`);
  const hasGudang = gudang.length > 0;
  const memilikiDoc = supportDoc("memiliki-menguasai");
  const bRows: [string, string][] = [
    ["Lokasi Kantor", kantorAddress || DASH],
    ...pabrikRows.map(([k, v]) => [k.replace("Alamat", "Lokasi"), v] as [string, string]),
    ...gudang.map((g, i) => [`Lokasi Gudang${gudang.length > 1 ? ` ${i + 1}` : ""}`, fullAddress(g) || DASH] as [string, string]),
    ["Gudang Bahan Baku", `${box(hasGudang)} Ada   ${box(!hasGudang)} Tidak ada`],
    ["Gudang Barang Jadi / Hasil Produksi", `${box(hasGudang)} Ada   ${box(!hasGudang)} Tidak ada`],
    ["Unit Pengolahan Limbah (milik sendiri atau kerja sama pihak lain)", `${BOX_OFF} Ada   ${BOX_OFF} Tidak ada`],
    [
      "Dasar Penguasaan Lokasi",
      [penguasaan.join("; "), memilikiDoc?.documentPath ? "surat pernyataan terlampir" : ""].filter(Boolean).join("; ") || DASH,
    ],
  ];
  add({ kind: "fields", rows: bRows.map(([k, v], i) => [`${i + 1}. ${k}`, v]) });
  add({ kind: "subheading", text: "2) Kapasitas perizinan" });
  add({
    kind: "table",
    headers: ["No", "KBLI 2020", "Jenis Produk", "Kapasitas Produksi per Tahun", "Kapasitas Terpasang per Tahun"],
    widths: [7, 15, 34, 22, 22],
    numeric: [3, 4],
    rows: buildCapacityRows(p).map((c, i) => [
      `${i + 1}.`,
      orDash(c.kbliCode),
      orDash(c.jenisProduk),
      c.berdasarkanIzin ? `${fmtNum(c.berdasarkanIzin)} ${c.satuan}`.trim() : DASH,
      c.kapasitasTerpasang ? `${fmtNum(c.kapasitasTerpasang)} ${c.satuan}`.trim() : DASH,
    ]),
  });

  // ---- C. Data pengisian
  add({ kind: "heading", text: "C. DATA PENGISIAN (Pasal 30 ayat (2) huruf a)" });
  add({ kind: "subheading", text: "1) Data kemampuan produksi setiap mesin per hari" });
  add({
    kind: "table",
    headers: ["No", "Jenis Mesin", "Merk / Model", "Unit", "Asal Negara", "Kapasitas / Hari (1 mesin)", "Satuan", "Kondisi", "Tahun"],
    widths: [6, 20, 20, 7, 11, 11, 9, 8, 8],
    numeric: [3, 5],
    center: [7, 8],
    rows: buildMachineChecklist(p).map((m, i) => {
      const jam = Number(m.kapasitasJam);
      const waktu = Number(m.waktuBeroperasi);
      const perMesin = m.kapasitasJam && m.waktuBeroperasi && Number.isFinite(jam) && Number.isFinite(waktu) ? String(jam * waktu) : m.kapasitas;
      const merkModel = [m.merk && `Merk: ${m.merk}`, m.model && `Model: ${m.model}`].filter(Boolean).join("; ");
      return [
        `${i + 1}.`,
        orDash(m.nama),
        merkModel || DASH,
        fmtNum(m.quantity) || DASH,
        DASH,
        fmtNum(perMesin) || DASH,
        orDash(m.kapasitasJamSatuan || m.kapasitasSatuan),
        m.kondisi ? MACHINE_KONDISI_LABELS[m.kondisi] : DASH,
        orDash(m.tahun),
      ];
    }),
  });

  const pq = buildProductionQtyChecklist(p);
  const capacity = p.capacity ?? [];
  const kbliOfProduct = (productId: string) => t(capacity.find((c) => c.productId === productId)?.kbliCode);
  const usage = buildRawMaterialUsageChecklist(p);
  const pabrikShort = fullAddress(pabrik[0]) || DASH;
  add({
    kind: "subheading",
    text: "2) Jumlah produksi dan penggunaan Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong, 1 (satu) tahun sebelumnya",
  });
  add({
    kind: "table",
    headers: ["No", "Produk", "KBLI", "Kode HS", "Jumlah Produksi", "Penggunaan Bahan Baku TPT", "Alamat Pabrik (sesuai SIINas)"],
    widths: [6, 20, 10, 13, 15, 16, 20],
    numeric: [4],
    rows: pq
      .filter((r) => r.section === "sebelumnya")
      .map((r, i) => {
        const used = usage.filter((u) => u.productId === r.productId && t(u.penggunaan));
        return [
          `${i + 1}.`,
          orDash(r.jenisProduk),
          kbliOfProduct(r.productId) || DASH,
          orDash(r.hsCode),
          r.jumlah ? `${fmtNum(r.jumlah)} ${r.satuan}`.trim() : DASH,
          used.length ? used.map((u) => `${u.jenis}: ${fmtNum(u.penggunaan)} ${u.satuan}`.trim()).join("; ") : DASH,
          pabrikShort,
        ];
      }),
  });

  add({ kind: "subheading", text: "3) Konversi penggunaan bahan baku dan/atau bahan penolong Tekstil dan/atau Produk Tekstil per jenis produk" });
  add({
    kind: "table",
    headers: ["No", "Produk", "Bahan Baku / Penolong", "Kode HS", "Volume Produksi", "Kebutuhan Bahan Baku", "Rasio Konversi"],
    widths: [6, 19, 19, 12, 15, 15, 14],
    numeric: [4, 5, 6],
    rows: buildRawMaterialConversionRows(p).map((c, i) => [
      `${i + 1}.`,
      orDash(c.productName),
      orDash(c.jenis),
      orDash(c.hsCode),
      c.volumeProduksiJumlah ? `${fmtNum(c.volumeProduksiJumlah)} ${c.volumeProduksiSatuan}`.trim() : DASH,
      c.volumeKebutuhanJumlah ? `${fmtNum(c.volumeKebutuhanJumlah)} ${c.volumeKebutuhanSatuan}`.trim() : DASH,
      fmtNum(c.rasioKonversi) || DASH,
    ]),
  });

  add({
    kind: "subheading",
    text: "4) Jumlah rencana produksi dan kebutuhan Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong, 1 (satu) tahun ke depan",
  });
  add({ kind: "para", text: "Rencana produksi:" });
  add({
    kind: "table",
    headers: ["No", "Produk", "Kode HS", "Rencana Produksi (1 tahun ke depan)", "Satuan", "Keterangan"],
    widths: [7, 33, 15, 18, 10, 17],
    numeric: [3],
    rows: pq
      .filter((r) => r.section === "rencana")
      .map((r, i) => [`${i + 1}.`, orDash(r.jenisProduk), orDash(r.hsCode), fmtNum(r.jumlah) || DASH, orDash(r.satuan), DASH]),
  });
  add({ kind: "para", text: "Kebutuhan bahan baku:" });
  add({
    kind: "table",
    headers: ["No", "Bahan Baku", "Kode HS", "Jumlah Dalam Negeri", "Jumlah Luar Negeri", "Satuan", "Negara Asal"],
    widths: [7, 22, 13, 15, 15, 10, 18],
    numeric: [3, 4],
    rows: usage.map((u, i) => [
      `${i + 1}.`,
      orDash(u.jenis),
      orDash(u.hsCode),
      fmtNum(u.rencanaKebutuhanDalamNegeri) || "0",
      fmtNum(u.rencanaKebutuhanLuarNegeri) || "0",
      orDash(u.satuan),
      orDash(u.rencanaKebutuhanNegaraAsal),
    ]),
  });

  add({
    kind: "subheading",
    text: "5) Jumlah penjualan di dalam negeri dan tujuan ekspor untuk setiap jenis dan pos tarif/harmonized system, 1 (satu) tahun sebelumnya",
  });
  add({
    kind: "table",
    headers: ["No", "Produk", "Kode HS", "Penjualan Dalam Negeri", "Penjualan Ekspor", "Satuan", "Tujuan Ekspor (Negara)"],
    widths: [7, 22, 13, 15, 14, 10, 19],
    numeric: [3, 4],
    rows: buildSalesChecklist(p).map((s, i) => [
      `${i + 1}.`,
      orDash(s.productName),
      orDash(s.hsCode),
      fmtNum(s.dalamNegeri) || "0",
      fmtNum(s.luarNegeri) || "0",
      orDash(s.satuan),
      orDash(s.negaraTujuan),
    ]),
  });

  add({ kind: "subheading", text: "6) Jumlah stok terkini Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong" });
  add({
    kind: "table",
    headers: ["No", "Nama Bahan Baku", "Kode HS", "Jumlah Stok", "Satuan"],
    widths: [8, 40, 18, 18, 16],
    numeric: [3],
    rows: usage.map((u, i) => [`${i + 1}.`, orDash(u.jenis), orDash(u.hsCode), fmtNum(u.dataStock) || "0", orDash(u.satuan)]),
  });

  // ---- D. Dokumen
  add({ kind: "heading", text: "D. DOKUMEN YANG DIUNGGAH / DILAMPIRKAN (Pasal 30 ayat (2) huruf b)" });
  const electricityFiles = (p.electricityMonths ?? []).map((m) => fileNameOf(m.documentPath)).filter(Boolean);
  const taxFiles = (p.taxProofs ?? []).map((tp) => fileNameOf(tp.docPath)).filter(Boolean);
  const under3 = p.companyAge === "UNDER_3";
  const sktFile = fileNameOf(p.sktDocumentPath);
  const machineDocs = (p.machines ?? []).filter((m) => t(m.nama)).length;
  const docRow = (no: number, label: string, info: string): string[] => [`${no}.`, label, box(Boolean(info)), box(!info), info || DASH];
  const pajakInfo = under3
    ? [sktFile, t(p.sktNumber) && `SKT ${t(p.sktNumber)}`].filter(Boolean).join("; ")
    : taxFiles.join("; ");
  add({
    kind: "table",
    headers: ["No", "Dokumen", "Ada", "Tidak ada", "Nama File / Nomor"],
    widths: [7, 45, 8, 10, 30],
    center: [2, 3],
    rows: [
      docRow(1, "Nomor pokok wajib pajak (NPWP)", [t(p.npwpNumber), fileNameOf(p.npwpDocumentPath)].filter(Boolean).join("; ")),
      docRow(2, "Perizinan Berusaha", [t(p.nibNumber) && `NIB ${t(p.nibNumber)}`, fileNameOf(p.nibDocumentPath)].filter(Boolean).join("; ")),
      docRow(3, "Data tenaga kerja", fileNameOf(p.tenagaKerjaDocumentPath) || (tenagaKerja ? `${tenagaKerja.toLocaleString("id-ID")} orang (diisi pada sistem)` : "")),
      docRow(4, "Data mesin dan peralatan produksi", machineDocs ? `${machineDocs} jenis mesin (diisi pada sistem)` : ""),
      docRow(5, "Gambar alur proses produksi", fileNameOf(supportDoc("alur-proses")?.documentPath)),
      docRow(
        6,
        "Surat pernyataan bermeterai dan ditandatangani pimpinan setingkat direktur: memiliki/menguasai gudang bahan baku dan/atau bahan penolong dan/atau gudang hasil produksi; dan/atau memiliki unit pengolahan limbah (Lampiran II huruf G)",
        fileNameOf(memilikiDoc?.documentPath),
      ),
      docRow(
        7,
        "Bukti pembayaran pajak 3 (tiga) tahun terakhir atau surat keterangan terdaftar pajak (bagi PB kurang dari 3 tahun)",
        pajakInfo,
      ),
      docRow(8, "Bukti pembayaran listrik 3 (tiga) bulan sebelumnya", electricityFiles.join("; ")),
    ],
  });

  // ---- E. Pajak
  add({ kind: "heading", text: "E. BUKTI PEMBAYARAN PAJAK / SURAT KETERANGAN TERDAFTAR PAJAK" });
  add({
    kind: "para",
    text: "Bukti pembayaran pajak 3 (tiga) tahun sebelumnya atau surat keterangan terdaftar pajak bagi Perusahaan Industri yang memiliki Perizinan Berusaha kurang dari 3 (tiga) tahun (Pasal 30 ayat (2) huruf b).",
  });
  const taxRows = (p.taxProofs ?? [])
    .filter((tp) => tp.type || tp.docPath || tp.nomor)
    .map((tp) =>
      [
        `Tahun ${tp.year}`,
        tp.type ? TAX_PROOF_TYPE_LABELS[tp.type as TaxProofType] : "",
        t(tp.nomor) && `No. ${t(tp.nomor)}`,
        tanggalId(tp.tanggal),
        fileNameOf(tp.docPath),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  const sktInfo = [sktFile, t(p.sktNumber) && `No. ${t(p.sktNumber)}`, tanggalId(p.sktDate), t(p.sktIssuer)].filter(Boolean).join("; ");
  add({
    kind: "table",
    headers: ["No", "Bukti Perpajakan", "Ada", "Nama File / Keterangan"],
    widths: [7, 48, 8, 37],
    center: [2],
    rows: [
      [
        "1.",
        "Bukti pembayaran pajak 3 (tiga) tahun sebelumnya",
        box(!under3 && taxRows.length > 0),
        under3 ? "Tidak berlaku (PB kurang dari 3 tahun)" : taxRows.join("\n") || DASH,
      ],
      [
        "2.",
        "Surat keterangan terdaftar pajak (bagi Perusahaan Industri yang memiliki Perizinan Berusaha kurang dari 3 (tiga) tahun)",
        box(under3 && Boolean(sktInfo)),
        under3 ? sktInfo || DASH : "Tidak berlaku (PB 3 tahun atau lebih)",
      ],
    ],
  });

  // ---- F. Listrik
  add({ kind: "heading", text: "F. BUKTI PEMBAYARAN LISTRIK 3 (TIGA) BULAN TERAKHIR" });
  add({
    kind: "para",
    text: `Bukti pembayaran listrik fasilitas produksi${electricityFiles.length ? `, berkas: ${electricityFiles.join("; ")}` : ""} (Pasal 30 ayat (2) huruf b).`,
  });
  add({
    kind: "table",
    headers: ["No", "Bulan", "Nominal Pembayaran", "Estimasi Pemakaian (kWh)", "Keterangan"],
    widths: [7, 18, 22, 20, 33],
    numeric: [2, 3],
    rows: (p.electricityMonths ?? []).map((m, i) => [
      `${i + 1}.`,
      bulanId(m.bulan) || DASH,
      t(m.nominal) ? `Rp${fmtNum(m.nominal)}` : DASH,
      fmtNum(m.kwh) || DASH,
      fileNameOf(m.documentPath) || DASH,
    ]),
  });

  // ---- G. Pernyataan
  add({ kind: "heading", text: "G. PERNYATAAN" });
  add({ kind: "para", text: "Demikian permohonan ini kami sampaikan. Data dan dokumen yang kami sampaikan adalah benar dan dapat dipertanggungjawabkan." });
  const signName = [pemohon || "(………………………………)", jabatan].filter(Boolean).join(", ");
  add({ kind: "sign", dateLine: `${kota}, ${tanggal}`, role: "Pemohon,", note: "meterai Rp10.000,00 + tanda tangan + cap perusahaan", name: signName });

  // ---- Lampiran: surat pernyataan memiliki/menguasai gudang / unit pengolahan limbah
  add({ kind: "pagebreak" });
  add({ kind: "heading", text: "LAMPIRAN" });
  add({
    kind: "para",
    italic: true,
    text: "Format Surat Pernyataan Memiliki atau Menguasai Gudang dan/atau Memiliki Unit Pengolahan Limbah (Lampiran II huruf G Permenperin 27/2025)",
  });
  add({ kind: "title", lines: ["SURAT PERNYATAAN"] });
  add({ kind: "para", text: "Yang bertanda tangan di bawah ini:" });
  add({
    kind: "fields",
    rows: [
      ["Nama", pemohon || DASH],
      ["Jabatan", jabatan || DASH],
    ],
  });
  add({ kind: "para", text: "dalam hal ini bertindak untuk dan atas nama:" });
  add({
    kind: "fields",
    rows: [
      ["Nama Perusahaan", companyName],
      ["Nomor Induk Berusaha", orDash(p.nibNumber)],
      ["Alamat Kantor", kantorAddress || DASH],
    ],
  });
  add({ kind: "para", text: "dengan ini menyatakan bahwa:" });
  add({
    kind: "para",
    align: "left",
    text: `a. memiliki/menguasai:\n     1. ${box(hasGudang)} gudang bahan baku dan/atau bahan penolong; dan/atau\n     2. ${box(hasGudang)} gudang hasil produksi; dan/atau\nb. ${BOX_OFF} memiliki unit pengolahan limbah sesuai dengan jenis industri atau bekerja sama dengan pihak lain.`,
  });
  add({
    kind: "para",
    text: "Surat Pernyataan ini dibuat dengan sebenar-benarnya dan dapat dipertanggungjawabkan untuk dipergunakan dalam proses Verifikasi Kemampuan Industri.",
  });
  add({ kind: "para", text: "Demikian, atas perhatian dan kerja sama Saudara, kami sampaikan terima kasih." });
  add({ kind: "sign", dateLine: `${kota}, ${tanggal}`, role: "Yang menyatakan,", note: "meterai Rp10.000,00 + tanda tangan + cap perusahaan", name: signName });
  add({ kind: "para", italic: true, text: "*) centang sesuai kebutuhan; penandatangan adalah pimpinan perusahaan setingkat direktur" });

  return {
    applicationNumber,
    companyName,
    kopLines: [companyName, kantorAddress, [t(p.companyPhone) && `Telp. ${t(p.companyPhone)}`, t(p.companyEmail)].filter(Boolean).join(" · ")].filter(Boolean),
    blocks,
  };
}
