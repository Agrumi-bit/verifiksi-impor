"use client";

import { materialNeeds } from "../../../lhvki-summary";
import { fmtNum, parseRekapBahanBaku, type ModuleProps, type RekapBahanBakuEntry } from "../analysis-types";
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
  // Rekapitulasi: one row per produk × bahan baku. Berdasarkan Permohonan comes from the application;
  // Berdasarkan Izin and Berdasarkan VKI are typed by the analyst. Stored as one JSON input
  // (rekapBahanBaku) that also carries the row names, so the report can print the same table.
  const rekap = parseRekapBahanBaku(inputs.rekapBahanBaku);
  // Pasal 32 ayat (3) huruf e dan f: kebutuhan = kapasitas (Perizinan Berusaha / hasil VKI, modul Kapasitas
  // Produksi) × rasio konversi. The analyst may overwrite either figure; an empty cell uses the calculation.
  const needs = materialNeeds(data.rawMaterialConversion, data.capacity, {
    ...data.technicalAnalysisData,
    bahanbaku: { ...data.technicalAnalysisData.bahanbaku, status: data.technicalAnalysisData.bahanbaku?.status ?? "PENDING", inputs },
  });
  const needOf = (id: string) => needs.find((n) => n.id === id);
  const auto = (n: number | null | undefined) => (n === null || n === undefined ? "" : fmtNum(n, 2));
  const rows = data.rawMaterialConversion;
  function setVolume(row: (typeof rows)[number], field: "izin" | "vki", value: string) {
    const current = rekap[row.id];
    const entry: RekapBahanBakuEntry = {
      produk: row.productName,
      bahanBaku: row.jenis,
      hsCode: row.hsCode,
      permohonan: row.volumeKebutuhanJumlah,
      satuan: row.volumeKebutuhanSatuan,
      izin: current?.izin ?? "",
      vki: current?.vki ?? "",
      [field]: value,
    };
    onInputChange("rekapBahanBaku", JSON.stringify({ ...rekap, [row.id]: entry }));
  }
  const th = "border border-[#c14a1f] px-3 py-2 text-left text-[11px] font-bold text-white";
  const cellInput = "w-full min-w-[110px] rounded-md border border-[#e8dccd] bg-white px-2 py-1 text-[12px] text-[#20180f] outline-none focus:border-[#e0662e] disabled:bg-[#f7f2ec]";

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
            "Rekapitulasi membandingkan volume kebutuhan bahan baku dan/atau bahan penolong untuk setiap jenis produksi berdasarkan izin, berdasarkan hasil Verifikasi Kemampuan Industri (VKI), dan berdasarkan permohonan.",
            "Kebutuhan berdasarkan izin dan berdasarkan VKI dihitung otomatis dari kapasitas produksi per tahun sesuai Perizinan Berusaha dan sesuai hasil VKI (modul Kapasitas Produksi) dikalikan rasio konversi bahan baku (Pasal 32 ayat (3) huruf e dan f). Analis dapat mengisi angka sendiri bila perhitungan tidak sesuai kondisi; kolom yang dikosongkan kembali memakai hasil perhitungan.",
          ]}
        />
        <div className="overflow-x-auto rounded-[9px] border border-[#efe2d4]">
          <table className="w-full border-collapse text-[12px]" style={{ minWidth: 820 }}>
            <thead>
              <tr className="bg-[#e0662e]">
                <th rowSpan={2} className={th} style={{ width: 44 }}>No</th>
                <th rowSpan={2} className={th}>Jenis Produksi</th>
                <th rowSpan={2} className={th}>Bahan Baku dan/atau Bahan Penolong</th>
                <th colSpan={3} className={`${th} text-center`}>Volume Bahan Baku</th>
                <th rowSpan={2} className={th}>Satuan</th>
              </tr>
              <tr className="bg-[#e0662e]">
                <th className={th}>Berdasarkan Izin</th>
                <th className={th}>Berdasarkan VKI</th>
                <th className={th}>Berdasarkan Permohonan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <Td>{index + 1}</Td>
                  <Td strong>{row.productName || "—"}</Td>
                  <Td>
                    {row.jenis || "—"}
                    {row.hsCode && <span className="block text-[10.5px] text-[#a68f80]">HS {row.hsCode}</span>}
                  </Td>
                  <Td>
                    {canEdit ? (
                      <>
                        <input value={rekap[row.id]?.izin ?? ""} onChange={(e) => setVolume(row, "izin", e.target.value)} placeholder={auto(needOf(row.id)?.izinOtomatis) || "Volume"} className={cellInput} />
                        {!rekap[row.id]?.izin && needOf(row.id)?.izinOtomatis != null && <span className="mt-0.5 block text-[10.5px] text-[#a68f80]">otomatis</span>}
                      </>
                    ) : (
                      rekap[row.id]?.izin || auto(needOf(row.id)?.izinOtomatis) || "—"
                    )}
                  </Td>
                  <Td>
                    {canEdit ? (
                      <>
                        <input value={rekap[row.id]?.vki ?? ""} onChange={(e) => setVolume(row, "vki", e.target.value)} placeholder={auto(needOf(row.id)?.vkiOtomatis) || "Volume"} className={cellInput} />
                        {!rekap[row.id]?.vki && needOf(row.id)?.vkiOtomatis != null && <span className="mt-0.5 block text-[10.5px] text-[#a68f80]">otomatis</span>}
                      </>
                    ) : (
                      rekap[row.id]?.vki || auto(needOf(row.id)?.vkiOtomatis) || "—"
                    )}
                  </Td>
                  <Td strong>{row.volumeKebutuhanJumlah || "—"}</Td>
                  <Td>{row.volumeKebutuhanSatuan || "—"}</Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-[#efe2d4] px-3 py-2 text-[#8a7565]">Belum ada data konversi bahan baku.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AnalystNote
          value={inputs.catatanB ?? ""}
          onChange={(v) => onInputChange("catatanB", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk rekapitulasi total kebutuhan bahan baku..."
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
