"use client";

import { capacitySummary, parseKapasitasVki } from "../../../lhvki-summary";
import { BOTTLENECK_TEXT, computeBottleneck } from "../../../kapasitas-calc";
import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { AnalystNote, ConclusionCard, HeroStat, Paragraphs, ResultBanner, Section, StatBoxes, Table, Td, StatusPill } from "./shared";

export function KapasitasModule({
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
  onMarkSesuaiCatatan,
  onSubmit,
  canEdit,
  submitting,
}: ModuleProps) {
  // Same calculation as the printed Laporan Analisis Teknis (kapasitas-calc.ts).
  const {
    machineRows,
    autoBottleneck,
    chosenName,
    chosenBottleneck,
    bottleneck,
    kapasitasLiniHarian,
    hariEfektif,
    kapasitasLiniTahunan,
    kapasitasLiniBulanan,
    satuanLini,
  } = computeBottleneck(data.machines, inputs);

  // Pasal 32 ayat (3) huruf c dan d: kapasitas per tahun sesuai Perizinan Berusaha (Kapasitas data on the
  // application) vs sesuai hasil VKI (typed by the analyst per row, stored as JSON in inputs.kapasitasVki).
  const capRows = capacitySummary(data.capacity, inputs);
  const kapasitasVki = parseKapasitasVki(inputs.kapasitasVki);
  function setKapasitasVki(id: string, value: string) {
    onInputChange("kapasitasVki", JSON.stringify({ ...kapasitasVki, [id]: value }));
  }

  const byProduct = new Map<string, { jenisProduk: string; deskripsi: string; hsCode: string; satuan: string; sebelumnya: string; rencana: string }>();
  for (const item of data.productionQty) {
    const existing = byProduct.get(item.productId) ?? {
      jenisProduk: item.jenisProduk,
      deskripsi: item.deskripsiProduk,
      hsCode: item.hsCode,
      satuan: item.satuan,
      sebelumnya: "",
      rencana: "",
    };
    if (item.section === "sebelumnya") existing.sebelumnya = item.jumlah;
    if (item.section === "rencana") existing.rencana = item.jumlah;
    byProduct.set(item.productId, existing);
  }
  const comparisonRows = [...byProduct.entries()].map(([productId, row]) => {
    const rencanaNum = parseNumeric(row.rencana);
    const sesuai = kapasitasLiniTahunan === null || rencanaNum === null ? null : rencanaNum <= kapasitasLiniTahunan;
    return { productId, ...row, rencanaNum, sesuai };
  });

  const utilisasiPct =
    kapasitasLiniTahunan && comparisonRows.length
      ? Math.round(
          (comparisonRows.reduce((sum, r) => sum + (r.rencanaNum ?? 0), 0) / (kapasitasLiniTahunan * comparisonRows.length)) * 100,
        )
      : null;
  const anyTidakSesuai = comparisonRows.some((r) => r.sesuai === false);

  return (
    <div className="flex flex-col gap-3.5">
      <Section title="Kapasitas Produksi">
        <Paragraphs
          items={[
            "Analisis kapasitas produksi dilakukan untuk memperoleh gambaran teknis mengenai kemampuan aktual fasilitas produksi perusahaan dalam menghasilkan produk dalam periode tertentu, serta untuk menilai kesesuaiannya dengan kapasitas produksi yang tercantum dalam dokumen perizinan berusaha, mengacu pada Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
            "Kapasitas akhir tidak ditentukan oleh proses dengan kapasitas tertinggi, tetapi oleh proses yang memiliki kapasitas efektif paling rendah atau menjadi bottleneck, karena proses tersebut menjadi pembatas terhadap throughput keseluruhan lini produksi.",
          ]}
        />
      </Section>

      <Section letter="A" title="Data Produksi Mesin">
        <Table headers={["Mesin", "Unit", "Kapasitas/Unit per Jam", "Jam Operasi", "Kapasitas/Hari", "Hari Efektif", "Kapasitas/Tahun"]} minWidth={820}>
          {machineRows.map((m) => (
            <tr key={m.id} style={bottleneck?.id === m.id ? { background: "#fbe4de" } : undefined}>
              <Td strong>
                {m.nama || "—"}
                {bottleneck?.id === m.id && <span className="ml-1.5 text-[10px] font-bold text-[#c1361f]">(Bottleneck)</span>}
              </Td>
              <Td>{m.quantity || "—"}</Td>
              <Td>
                {m.kapasitasJam || "—"} {m.kapasitasJamSatuan}
              </Td>
              <Td>{m.waktuBeroperasi || "—"} jam</Td>
              <Td strong>
                {m.perHari !== null ? fmtNum(m.perHari, 2) : "—"} {m.perHari !== null ? m.kapasitasJamSatuan : ""}
              </Td>
              <Td>{m.hariEfektifPerTahun ? `${m.hariEfektifPerTahun} hari` : "—"}</Td>
              <Td>
                {m.perTahun !== null ? fmtNum(m.perTahun, 0) : "—"} {m.perTahun !== null ? m.kapasitasJamSatuan : ""}
              </Td>
            </tr>
          ))}
        </Table>
        <AnalystNote value={keterangan} onChange={onKeteranganChange} canEdit={canEdit} placeholder="Catatan analis untuk data produksi mesin..." />
      </Section>

      <Section letter="B" title="Penentuan Bottleneck dan Kapasitas Teoritis">
        <Paragraphs
          items={[
            BOTTLENECK_TEXT,
          ]}
        />
        <div className="mb-3.5 flex flex-col gap-1">
          <label htmlFor="kapasitas-bottleneck" className="text-[11.5px] font-semibold text-[#4a4038]">
            Mesin/Proses Bottleneck
          </label>
          {canEdit ? (
            <select
              id="kapasitas-bottleneck"
              value={chosenBottleneck ? chosenName : ""}
              onChange={(event) => onInputChange("mesinBottleneck", event.target.value)}
              className="w-full max-w-[460px] rounded-lg border border-[#e1bfb3] bg-white px-3 py-2 text-[12.5px] text-[#20180f] outline-none focus:border-[#e0662e]"
            >
              <option value="">
                Otomatis — kapasitas/hari terkecil{autoBottleneck ? ` (${autoBottleneck.nama || "—"})` : ""}
              </option>
              {machineRows
                .filter((m) => (m.nama ?? "").trim())
                .map((m) => (
                  <option key={m.id} value={(m.nama ?? "").trim()}>
                    {m.nama} — {m.perHari !== null ? `${fmtNum(m.perHari, 0)}/hari` : "kapasitas belum diisi"}
                  </option>
                ))}
            </select>
          ) : (
            <div className="text-[12.5px] text-[#20180f]">
              {bottleneck?.nama || "—"} <span className="text-[#8a7565]">({chosenBottleneck ? "dipilih analis" : "otomatis, kapasitas/hari terkecil"})</span>
            </div>
          )}
        </div>
        <StatBoxes
          items={[
            { label: "Mesin/Proses Bottleneck", value: bottleneck?.nama || "—" },
            { label: "Kapasitas Lini per Hari", value: kapasitasLiniHarian !== null ? `${fmtNum(kapasitasLiniHarian, 0)} ${satuanLini}` : "—" },
            { label: "Kapasitas Lini per Bulan (rata-rata)", value: kapasitasLiniBulanan !== null ? `${fmtNum(kapasitasLiniBulanan, 0)} ${satuanLini}` : "—" },
          ]}
        />
        <HeroStat
          label="Kapasitas Produksi per Tahun"
          value={kapasitasLiniTahunan !== null ? `${fmtNum(kapasitasLiniTahunan, 0)} ${satuanLini}` : "—"}
          note={kapasitasLiniTahunan !== null ? `(${fmtNum(kapasitasLiniHarian, 0)} × ${fmtNum(hariEfektif, 0)} hari efektif)` : undefined}
        />
        <AnalystNote
          value={inputs.catatanB ?? ""}
          onChange={(v) => onInputChange("catatanB", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk penentuan bottleneck dan kapasitas teoritis..."
        />
      </Section>

      <Section letter="C" title="Kapasitas Produksi per Tahun: Perizinan Berusaha dan Hasil VKI">
        <Paragraphs
          items={[
            "Sesuai Pasal 32 ayat (3) huruf c dan d Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, LHVKI memuat kapasitas produksi per tahun sesuai Perizinan Berusaha dan kapasitas produksi per tahun sesuai hasil VKI. Kapasitas sesuai Perizinan Berusaha diambil dari data kapasitas permohonan; kapasitas hasil VKI ditetapkan analis berdasarkan perhitungan bottleneck dan hasil verifikasi lapangan.",
          ]}
        />
        <Table headers={["No", "Jenis Produk", "KBLI", "Sesuai Perizinan Berusaha", "Kapasitas Terpasang", "Sesuai Hasil VKI", "Satuan", "Selisih"]} minWidth={980}>
          {capRows.map((row, i) => (
            <tr key={row.id}>
              <Td>{i + 1}</Td>
              <Td strong>{row.jenisProduk || "—"}</Td>
              <Td>{row.kbli || "—"}</Td>
              <Td>{row.izin !== null ? fmtNum(row.izin, 2) : "—"}</Td>
              <Td>{row.terpasang !== null ? fmtNum(row.terpasang, 2) : "—"}</Td>
              <td className="border border-[#efe2d4] px-3 py-2">
                {canEdit ? (
                  <div className="flex flex-col gap-1">
                    <input
                      value={kapasitasVki[row.id] ?? ""}
                      onChange={(e) => setKapasitasVki(row.id, e.target.value)}
                      placeholder="Kapasitas per tahun"
                      className="w-full min-w-[130px] rounded-md border border-[#e8dccd] bg-white px-2 py-1 text-[12px] text-[#20180f] outline-none focus:border-[#e0662e]"
                    />
                    {kapasitasLiniTahunan !== null && (
                      <button
                        type="button"
                        onClick={() => setKapasitasVki(row.id, String(Math.round(kapasitasLiniTahunan)))}
                        className="self-start text-[10.5px] font-semibold text-[#2f6fe0] hover:underline"
                      >
                        Pakai hasil bottleneck ({fmtNum(kapasitasLiniTahunan, 0)})
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="font-bold text-[#20180f]">{row.vki !== null ? fmtNum(row.vki, 2) : "—"}</span>
                )}
              </td>
              <Td>{row.satuan || "—"}</Td>
              <Td>{row.selisihPct === null ? "—" : `${row.selisihPct >= 0 ? "+" : ""}${fmtNum(row.selisihPct, 1)}%`}</Td>
            </tr>
          ))}
          {capRows.length === 0 && (
            <tr>
              <td colSpan={8} className="border border-[#efe2d4] px-3 py-2 text-[#8a7565]">
                Belum ada data kapasitas perizinan (diisi pada data Kapasitas permohonan / Verifikasi Jumlah Produksi).
              </td>
            </tr>
          )}
        </Table>
        <AnalystNote
          value={inputs.catatanKapasitasIzin ?? ""}
          onChange={(v) => onInputChange("catatanKapasitasIzin", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk kapasitas sesuai Perizinan Berusaha dan hasil VKI..."
        />
      </Section>

      <Section letter="D" title="Perbandingan Kapasitas dengan Rencana Produksi">
        <Paragraphs
          items={[
            "Volume rencana produksi yang diajukan pada permohonan dibandingkan dengan kapasitas produksi tahunan hasil perhitungan bottleneck di atas, untuk menilai kewajaran rencana produksi terhadap kapasitas fasilitas yang telah diverifikasi.",
          ]}
        />
        <Table headers={["Produk", "HS Code", "Vol. Sebelumnya", "Vol. Rencana", "Vol. Perhitungan (Tahunan)", "Satuan", "Status"]} minWidth={800}>
          {comparisonRows.map((row) => (
            <tr key={row.productId}>
              <Td strong>{row.jenisProduk || "—"}</Td>
              <Td>{row.hsCode || "—"}</Td>
              <Td>{row.sebelumnya || "—"}</Td>
              <Td>{row.rencana || "—"}</Td>
              <Td strong>{kapasitasLiniTahunan !== null ? fmtNum(kapasitasLiniTahunan, 0) : "—"}</Td>
              <Td>{row.satuan || "—"}</Td>
              <td className="border border-[#efe2d4] px-3 py-2">
                {row.sesuai === null ? (
                  "—"
                ) : row.sesuai ? (
                  <StatusPill label="Sesuai" bg="#e2f7ea" color="#1a9850" />
                ) : (
                  <StatusPill label="Tidak Sesuai" bg="#fbe4de" color="#c1361f" />
                )}
              </td>
            </tr>
          ))}
          {comparisonRows.length === 0 && (
            <tr>
              <Td>Belum ada data rencana produksi.</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </tr>
          )}
        </Table>
        <AnalystNote
          value={inputs.catatanC ?? ""}
          onChange={(v) => onInputChange("catatanC", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk perbandingan kapasitas dengan rencana produksi..."
        />
      </Section>

      <Section letter="E" title="Kesimpulan">
        <ResultBanner
          bg={anyTidakSesuai ? "#fbe4de" : "#e2f7ea"}
          color={anyTidakSesuai ? "#c1361f" : "#1a9850"}
          icon={anyTidakSesuai ? "warning" : "check_circle"}
          text={
            utilisasiPct !== null
              ? anyTidakSesuai
                ? `Terdapat rencana produksi yang melebihi kapasitas lini hasil perhitungan (rata-rata utilisasi ${utilisasiPct}%).`
                : `Rencana produksi berada dalam kapasitas lini hasil perhitungan (rata-rata utilisasi ${utilisasiPct}%).`
              : "Belum dapat dihitung — data mesin atau rencana produksi belum lengkap."
          }
        />
      </Section>

      <ConclusionCard
        text={kesimpulan}
        onTextChange={onKesimpulanChange}
        status={status}
        onMarkSesuai={onMarkSesuai}
        onMarkTidakSesuai={onMarkTidakSesuai}
        onMarkSesuaiCatatan={onMarkSesuaiCatatan}
        onSubmit={onSubmit}
        canEdit={canEdit}
        submitting={submitting}
      />
    </div>
  );
}
