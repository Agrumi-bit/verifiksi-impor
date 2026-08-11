"use client";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { AnalystNote, ConclusionCard, Formula, Paragraphs, Section, Table, Td } from "./shared";

export function BahanBakuModule({
  data,
  inputs,
  onInputChange,
  keterangan,
  onKeteranganChange,
  kesimpulan,
  onKesimpulanChange,
  status,
  onMarkSesuai,
  onMarkTidakSesuai,
  onSubmit,
  canEdit,
  submitting,
}: ModuleProps) {
  const rekapMap = new Map<string, { hsCode: string; uraian: string; satuan: string; total: number }>();
  for (const row of data.rawMaterialConversion) {
    const key = `${row.hsCode}|${row.jenis}`;
    const existing = rekapMap.get(key) ?? { hsCode: row.hsCode, uraian: row.jenis, satuan: row.volumeKebutuhanSatuan, total: 0 };
    existing.total += parseNumeric(row.volumeKebutuhanJumlah) ?? 0;
    rekapMap.set(key, existing);
  }
  const rekapRows = [...rekapMap.values()];

  return (
    <div className="flex flex-col gap-3.5">
      <Section title="Kapasitas Kebutuhan Bahan Baku">
        <Paragraphs
          items={[
            "Analisis kebutuhan dan pemakaian bahan baku dilakukan untuk menilai keterkaitan antara kapasitas produksi, jenis produk yang dihasilkan, kebutuhan bahan baku dan/atau bahan penolong, serta rasio konversi penggunaannya, mengacu pada Pasal 30 ayat (2) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
            "Analisis dilakukan untuk memastikan bahwa kebutuhan bahan baku yang disampaikan perusahaan memiliki hubungan yang logis dan proporsional dengan volume produksi, karakteristik produk, serta proses produksi yang telah diverifikasi di lapangan.",
          ]}
        />
        <Formula>Kebutuhan Bahan Baku = Volume Produksi × Rasio Konversi Bahan Baku</Formula>
      </Section>

      <Section letter="A" title="Kebutuhan Bahan Baku per Produk">
        <Table headers={["Produk", "Bahan Baku", "HS Code", "Kategori", "Volume Kebutuhan (Permohonan)", "Rasio Konversi"]} minWidth={900}>
          {data.rawMaterialConversion.map((row) => (
            <tr key={row.id}>
              <Td strong>{row.productName || "—"}</Td>
              <Td>{row.jenis || "—"}</Td>
              <Td>{row.hsCode || "—"}</Td>
              <Td>{row.kategori || "—"}</Td>
              <Td strong>
                {row.volumeKebutuhanJumlah || "—"} {row.volumeKebutuhanSatuan}
              </Td>
              <Td>{row.rasioKonversi || "—"}</Td>
            </tr>
          ))}
          {data.rawMaterialConversion.length === 0 && (
            <tr>
              <Td>Belum ada data konversi bahan baku.</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </tr>
          )}
        </Table>
        <AnalystNote value={keterangan} onChange={onKeteranganChange} canEdit={canEdit} placeholder="Catatan analis untuk kebutuhan bahan baku per produk..." />
      </Section>

      <Section letter="B" title="Rekapitulasi Total Kebutuhan Bahan Baku">
        <Paragraphs
          items={[
            "Satu HS Code dapat muncul pada beberapa jenis produk dengan kebutuhan bahan baku yang berbeda. Rekapitulasi ini menjumlahkan kebutuhan dari setiap produk yang menggunakan HS Code dan jenis bahan baku yang sama, sebagai konsolidasi akhir kebutuhan bahan baku perusahaan secara agregat.",
          ]}
        />
        <Table headers={["HS Code", "Uraian Barang", "Total Kebutuhan (Permohonan)", "Satuan"]}>
          {rekapRows.map((row) => (
            <tr key={`${row.hsCode}-${row.uraian}`}>
              <Td strong>{row.hsCode || "—"}</Td>
              <Td>{row.uraian || "—"}</Td>
              <Td strong>{fmtNum(row.total, 2)}</Td>
              <Td>{row.satuan || "—"}</Td>
            </tr>
          ))}
          {rekapRows.length === 0 && (
            <tr>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </tr>
          )}
        </Table>
        <AnalystNote
          value={inputs.catatanB ?? ""}
          onChange={(v) => onInputChange("catatanB", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk rekapitulasi total kebutuhan bahan baku..."
        />
      </Section>

      <Section letter="C" title="Volume Perizinan">
        <Paragraphs items={["Dicatat oleh analis dari dokumen fisik izin yang diverifikasi, sebagai pembanding terhadap volume kebutuhan berdasarkan permohonan di atas."]} />
        <textarea
          rows={3}
          value={inputs.volumeIzin ?? ""}
          disabled={!canEdit}
          onChange={(e) => onInputChange("volumeIzin", e.target.value)}
          placeholder="Catat volume perizinan per bahan baku/HS Code untuk dibandingkan dengan volume permohonan..."
          className="w-full resize-y rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
        />
        <AnalystNote
          value={inputs.catatanC ?? ""}
          onChange={(v) => onInputChange("catatanC", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk volume perizinan..."
        />
      </Section>

      <ConclusionCard
        text={kesimpulan}
        onTextChange={onKesimpulanChange}
        status={status}
        onMarkSesuai={onMarkSesuai}
        onMarkTidakSesuai={onMarkTidakSesuai}
        onSubmit={onSubmit}
        canEdit={canEdit}
        submitting={submitting}
      />
    </div>
  );
}
