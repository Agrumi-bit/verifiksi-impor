"use client";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { AnalystNote, ConclusionCard, Paragraphs, ResultBanner, Section, StatBoxes, Table, Td, StatusPill } from "./shared";

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
  onSubmit,
  canEdit,
  submitting,
}: ModuleProps) {
  const machineRows = data.machines.map((m) => ({ ...m, perHari: parseNumeric(m.kapasitasPerHari) }));
  const withCapacity = machineRows.filter((m) => m.perHari !== null && m.perHari > 0);
  // Default: the machine with the lowest daily capacity. The analyst can pick another machine/process
  // as the bottleneck (stored by name in inputs.mesinBottleneck, so the report prints it as such).
  const autoBottleneck = withCapacity.length > 0 ? withCapacity.reduce((min, m) => (m.perHari! < min.perHari! ? m : min)) : null;
  const chosenName = inputs.mesinBottleneck?.trim() ?? "";
  const chosenBottleneck = chosenName ? (machineRows.find((m) => (m.nama ?? "").trim() === chosenName) ?? null) : null;
  const bottleneck = chosenBottleneck ?? autoBottleneck;
  const kapasitasLiniHarian = bottleneck?.perHari ?? null;
  const kapasitasLiniBulanan = kapasitasLiniHarian !== null ? kapasitasLiniHarian * 26 : null;
  const kapasitasLiniTahunan = kapasitasLiniBulanan !== null ? kapasitasLiniBulanan * 12 : null;

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
        <Table headers={["Mesin", "Unit", "Kapasitas/Unit", "Jam Operasi", "Kapasitas/Hari"]}>
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
              <Td strong>{m.kapasitasPerHari || "—"}</Td>
            </tr>
          ))}
        </Table>
        <AnalystNote value={keterangan} onChange={onKeteranganChange} canEdit={canEdit} placeholder="Catatan analis untuk data produksi mesin..." />
      </Section>

      <Section letter="B" title="Penentuan Bottleneck dan Kapasitas Teoritis">
        <Paragraphs
          items={[
            "Kapasitas produksi keseluruhan lini ditentukan oleh tahapan proses dengan kapasitas produksi harian terkecil (bottleneck), karena tahapan tersebut membatasi kapasitas produksi lini secara menyeluruh.",
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
            { label: "Kapasitas Lini per Hari", value: kapasitasLiniHarian !== null ? `${fmtNum(kapasitasLiniHarian, 0)} pcs` : "—" },
            { label: "Kapasitas Lini per Bulan (26 hari)", value: kapasitasLiniBulanan !== null ? `${fmtNum(kapasitasLiniBulanan, 0)} pcs` : "—" },
          ]}
        />
        <div className="mb-4 rounded-[9px] bg-[#f7f2ec] px-3.5 py-3">
          <div className="text-[11px] text-[#8a7565]">Kapasitas Produksi per Tahun</div>
          <div className="mt-0.75 text-[16px] font-extrabold text-[#20180f]">
            {kapasitasLiniTahunan !== null ? `${fmtNum(kapasitasLiniTahunan, 0)} pcs` : "—"}
          </div>
        </div>
        <AnalystNote
          value={inputs.catatanB ?? ""}
          onChange={(v) => onInputChange("catatanB", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk penentuan bottleneck dan kapasitas teoritis..."
        />
      </Section>

      <Section letter="C" title="Perbandingan Kapasitas dengan Rencana Produksi">
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

      <Section letter="D" title="Kesimpulan">
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
        onSubmit={onSubmit}
        canEdit={canEdit}
        submitting={submitting}
      />
    </div>
  );
}
