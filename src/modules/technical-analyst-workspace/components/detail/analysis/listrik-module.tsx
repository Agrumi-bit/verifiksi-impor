"use client";

import { useQuery } from "@tanstack/react-query";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { AnalystNote, ConclusionCard, EditableStatBox, Formula, Paragraphs, ResultBanner, Section, HeroStat, Table, Td, StatusPill, ToggleSwitch } from "./shared";

type ElectricityTariffRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  kelompok: string;
  golongan: string;
  batasDaya: string;
  tarifPerKwh: string;
};

function useElectricityTariffs() {
  return useQuery({
    queryKey: ["master-data-electricity-tariff"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/electricity-tariff");
      if (!response.ok) throw new Error("Gagal memuat golongan tarif listrik");
      const json = (await response.json()) as { data: ElectricityTariffRow[] };
      return json.data.filter((row) => row.status === "ACTIVE");
    },
  });
}

const ENERGY_SOURCE_DEFS = [
  { key: "genset", label: "Genset", desc: "Pembangkit listrik sendiri, umumnya menggunakan diesel/solar" },
  { key: "plts", label: "PLTS / Solar Panel", desc: "Pembangkit listrik tenaga surya" },
  { key: "pltmh", label: "PLTMH / PLTA", desc: "Pembangkit listrik tenaga air" },
  { key: "pltb", label: "PLTB", desc: "Pembangkit listrik tenaga angin" },
  { key: "biomassa", label: "Biomassa", desc: "Pembangkit listrik berbasis biomassa" },
  { key: "gas", label: "Pembangkit Listrik Gas", desc: "Pembangkit sendiri menggunakan gas" },
  { key: "lainnya", label: "Lainnya", desc: "Sumber listrik lain yang dapat dibuktikan secara administratif/fisik" },
];

function varianceLabel(pct: number | null): { label: string; bg: string; color: string } {
  if (pct === null) return { label: "—", bg: "#f2ece5", color: "#a68f80" };
  const abs = Math.abs(pct);
  if (abs <= 10) return { label: "Sangat Sesuai", bg: "#e2f7ea", color: "#1a9850" };
  if (abs <= 25) return { label: "Masih Wajar", bg: "#e6effa", color: "#2f6fe0" };
  if (abs <= 50) return { label: "Perlu Klarifikasi", bg: "#fdf0d5", color: "#a3690a" };
  return { label: "Perlu Verifikasi Lebih Lanjut", bg: "#fbe4de", color: "#c1361f" };
}

export function ListrikModule({
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
  const machineRows = data.machines.map((m) => {
    const power = parseNumeric(m.power);
    const jumlah = parseNumeric(m.quantity);
    const waktu = parseNumeric(m.waktuBeroperasi);
    const totalDaya = power !== null && jumlah !== null ? power * jumlah : null;
    const dayaPerHari = totalDaya !== null && waktu !== null ? totalDaya * waktu : null;
    return { ...m, power, jumlah, waktu, totalDaya, dayaPerHari };
  });
  // Total Daya Mesin Produksi (table) and Total Power Consumption Perusahaan per Bulan
  // (hero stat below) both trace back to this same totalDailyConsumption — 85% load
  // factor + 15% non-operational allowance, x 26 working days/month.
  const totalPower = machineRows.reduce((sum, m) => sum + (m.totalDaya ?? 0), 0);
  const totalDailyConsumption = machineRows.reduce((sum, m) => sum + (m.dayaPerHari ?? 0), 0);
  const rataRataBeban = totalDailyConsumption * 0.85;
  const nonOperasional = rataRataBeban * 0.15;
  const totalKebutuhanHarian = rataRataBeban + nonOperasional;
  const totalMonthlyConsumption = totalKebutuhanHarian * 26;


  const { data: tariffs, isLoading: tariffsLoading } = useElectricityTariffs();
  const selectedTariff = tariffs?.find((t) => t.id === inputs.tarifId) ?? null;
  const selectedTariffNominal = parseNumeric(selectedTariff?.tarifPerKwh);
  const estimasiPembayaran = selectedTariffNominal !== null ? totalMonthlyConsumption * selectedTariffNominal : null;

  const varianceRows = data.electricityMonths.map((month) => {
    const actualNominal = parseNumeric(month.nominal);
    const variancePct =
      actualNominal !== null && estimasiPembayaran ? ((actualNominal - estimasiPembayaran) / estimasiPembayaran) * 100 : null;
    return { month, actualNominal, variancePct, meta: varianceLabel(variancePct) };
  });
  const maxAbsVariance = Math.max(0, ...varianceRows.map((r) => (r.variancePct !== null ? Math.abs(r.variancePct) : 0)));
  const overall = varianceLabel(varianceRows.length ? maxAbsVariance : null);

  return (
    <div className="flex flex-col gap-3.5">
      <Section title="Analisis Kebutuhan dan Pemakaian Energi Listrik">
        <Paragraphs
          items={[
            "Analisis kebutuhan dan pemakaian energi listrik dilakukan untuk memperoleh gambaran mengenai kebutuhan energi yang diperlukan dalam mendukung kegiatan operasional dan proses produksi. Analisis ini menjadi bagian dari verifikasi kemampuan industri, khususnya untuk menilai kesesuaian antara fasilitas dan mesin produksi yang dimiliki dengan aktivitas operasional perusahaan.",
            "Pelaksanaan pemeriksaan bukti pembayaran listrik mengacu pada Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 tentang Tata Cara Penerbitan Pertimbangan Teknis Impor Tekstil dan Produk Tekstil, yang mensyaratkan dokumen bukti pembayaran listrik 3 (tiga) bulan terakhir sebagai salah satu dokumen yang diperiksa. Untuk aspek tarif, analisis memperhatikan Peraturan Menteri ESDM Nomor 7 Tahun 2024 tentang Tarif Tenaga Listrik yang Disediakan oleh PT PLN (Persero).",
          ]}
        />
      </Section>

      <Section letter="A" title="Dasar Perhitungan">
        <Paragraphs
          items={[
            "Analisis kebutuhan energi listrik dilakukan berdasarkan jumlah mesin produksi, daya terpasang masing-masing mesin, jam operasional perusahaan, faktor penggunaan mesin (Load Factor), dan hari kerja efektif. Hasil perhitungan teoritis kemudian dibandingkan terhadap konsumsi listrik aktual berdasarkan bukti pembayaran rekening listrik perusahaan.",
          ]}
        />
        <Formula>Konsumsi Energi (kWh) = Total Daya Terpasang (kW) × Jam Operasional (jam/hari) × Load Factor × Hari Kerja Efektif (hari/tahun)</Formula>
      </Section>

      <Section letter="B" title="Data Mesin dan Perhitungan Daya">
        <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Tabel Data Daya Mesin</div>
        <Table headers={["Mesin", "Quantity", "Daya/Unit (kW)", "Total Daya (kW)", "Jam Operasi", "Daya Digunakan/Hari (kWh)"]}>
          {machineRows.map((m) => (
            <tr key={m.id}>
              <Td strong>{m.nama || "—"}</Td>
              <Td>{m.jumlah ?? "—"} pcs</Td>
              <Td>{m.power ?? "—"} kW</Td>
              <Td>{fmtNum(m.totalDaya, 2)}</Td>
              <Td>{m.waktu ?? "—"} jam</Td>
              <Td strong>{fmtNum(m.dayaPerHari, 2)}</Td>
            </tr>
          ))}
          <tr>
            <Td strong>Total Daya Mesin Produksi</Td>
            <Td>—</Td>
            <Td>—</Td>
            <Td strong>{fmtNum(totalPower, 2)} kW</Td>
            <Td>—</Td>
            <Td strong>{fmtNum(totalDailyConsumption, 2)} kWh</Td>
          </tr>
        </Table>
        <AnalystNote value={keterangan} onChange={onKeteranganChange} canEdit={canEdit} placeholder="Catatan analis untuk data mesin dan perhitungan daya..." />
      </Section>

      <Section letter="C" title="Beban Produksi Teoritis">
        <Paragraphs
          items={[
            "Dalam kondisi aktual, seluruh mesin tidak bekerja secara bersamaan pada beban maksimum (full load). Berdasarkan praktik operasional industri, faktor beban (Load Factor) mesin produksi umumnya berada pada kisaran 80–90%; analisis ini menggunakan Load Factor sebesar 85%.",
          ]}
        />
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="rounded-[9px] bg-[#f7f2ec] px-3.5 py-3">
            <div className="text-[11px] text-[#8a7565]">Total Daya Terpasang</div>
            <div className="mt-0.75 text-[16px] font-extrabold text-[#20180f]">{fmtNum(totalPower, 2)} kW</div>
          </div>
          <div className="rounded-[9px] bg-[#f7f2ec] px-3.5 py-3">
            <div className="text-[11px] text-[#8a7565]">Total Power Consumption per Hari</div>
            <div className="mt-0.75 text-[16px] font-extrabold text-[#20180f]">{fmtNum(totalDailyConsumption, 2)} kWh/hari</div>
          </div>
          <EditableStatBox
            label="Estimasi Jam Operasi Aktual"
            value={inputs.estimasiJamOperasi ?? ""}
            onChange={(v) => onInputChange("estimasiJamOperasi", v)}
            canEdit={canEdit}
            unit="jam/bulan"
          />
        </div>
        <Formula>
          {fmtNum(totalDailyConsumption, 2)} kWh/hari × 85% = {fmtNum(rataRataBeban, 2)} kWh (mesin) + {fmtNum(nonOperasional, 2)} kWh (non-operasional, 15%) = {fmtNum(totalKebutuhanHarian, 2)} kWh/hari
        </Formula>
        <HeroStat label="Total Power Consumption Perusahaan per Bulan (26 hari kerja)" value={`${fmtNum(totalMonthlyConsumption, 0)} kWh`} />

        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[11.5px] font-bold text-[#20180f]">Golongan Tarif Listrik</div>
            <select
              value={selectedTariff?.id ?? ""}
              disabled={!canEdit || tariffsLoading}
              onChange={(e) => onInputChange("tarifId", e.target.value)}
              className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
            >
              {tariffsLoading && <option value="">Memuat...</option>}
              {!tariffsLoading && <option value="">Pilih golongan tarif...</option>}
              {tariffs?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.kelompok} — {t.golongan} ({t.batasDaya})
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-bold text-[#20180f]">Tarif Nominal per kWh</div>
            <div className="rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] font-bold text-[#20180f]">
              {selectedTariffNominal !== null ? `Rp ${fmtNum(selectedTariffNominal, 2)} / kWh` : "—"}
            </div>
          </div>
        </div>
        <HeroStat label="Estimasi Jumlah Pembayaran Listrik per Bulan" value={estimasiPembayaran !== null ? `Rp ${fmtNum(estimasiPembayaran, 0)}` : "—"} />

        <div className="mb-2 text-[11.5px] font-bold text-[#20180f]">Sumber Energi Listrik Selain PLN</div>
        <div className="overflow-x-auto rounded-[9px] border border-[#e8dccd]">
          <div className="grid min-w-[640px] grid-cols-[34px_1.3fr_1.7fr_90px_140px] bg-[#f7f2ec] px-3 py-2.5 text-[11px] font-bold text-[#6b5b4c]">
            <div>No</div>
            <div>Sumber Energi Listrik</div>
            <div>Keterangan</div>
            <div>Ada / Tidak</div>
            <div>Jumlah Pemakaian</div>
          </div>
          {ENERGY_SOURCE_DEFS.map((source, i) => {
            const ada = inputs[`energySource_${source.key}_status`] === "ada";
            return (
              <div
                key={source.key}
                className="grid min-w-[640px] grid-cols-[34px_1.3fr_1.7fr_90px_140px] items-center border-t border-[#f0ded0] px-3 py-2.5"
              >
                <div className="text-[12.5px] text-[#6b5b4c]">{i + 1}</div>
                <div className="text-[12.5px] font-bold text-[#20180f]">{source.label}</div>
                <div className="text-[11.5px] leading-[1.4] text-[#4a4038]">{source.desc}</div>
                <ToggleSwitch
                  checked={ada}
                  disabled={!canEdit}
                  onChange={(checked) => onInputChange(`energySource_${source.key}_status`, checked ? "ada" : "tidak")}
                />
                {ada ? (
                  <input
                    type="text"
                    value={inputs[`energySource_${source.key}_jumlah`] ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => onInputChange(`energySource_${source.key}_jumlah`, e.target.value)}
                    placeholder="kWh/bulan"
                    className="w-full rounded-md border-none bg-[#f7f2ec] px-2 py-1.5 text-[11.5px] text-[#20180f] outline-none disabled:opacity-60"
                  />
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
        <AnalystNote
          value={inputs.catatanB ?? ""}
          onChange={(v) => onInputChange("catatanB", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk beban produksi teoritis dan tarif listrik..."
        />
      </Section>

      <Section letter="D" title="Analisis Tagihan Listrik terhadap Kapasitas Produksi">
        <Paragraphs
          items={[
            "Analisis pada bagian ini membandingkan estimasi kebutuhan daya listrik hasil perhitungan (dalam Rupiah, berdasarkan golongan tarif yang dipilih) dengan realisasi tagihan pembayaran listrik yang tercantum pada rekening PLN perusahaan. Selisih yang berada dalam rentang wajar mengindikasikan kapasitas produksi dan jumlah mesin yang dilaporkan sesuai dengan konsumsi energi listrik yang sebenarnya.",
          ]}
        />
        <div className="mb-2 text-center text-[12.5px] font-bold text-[#20180f]">Perbandingan dengan Rekening Listrik</div>
        <Table headers={["Bulan", "Estimasi Perhitungan", "Tagihan PLN Aktual", "Selisih", "Status"]}>
          {varianceRows.map((row) => (
            <tr key={row.month.id}>
              <Td strong>{row.month.bulan || "—"}</Td>
              <Td>{estimasiPembayaran !== null ? `Rp ${fmtNum(estimasiPembayaran, 0)}` : "—"}</Td>
              <Td>{row.actualNominal !== null ? `Rp ${fmtNum(row.actualNominal, 0)}` : "—"}</Td>
              <Td>{row.variancePct !== null ? `${fmtNum(row.variancePct)}%` : "—"}</Td>
              <td className="border border-[#efe2d4] px-3 py-2">
                <StatusPill label={row.meta.label} bg={row.meta.bg} color={row.meta.color} />
              </td>
            </tr>
          ))}
          {varianceRows.length === 0 && (
            <tr>
              <Td>Belum ada data tagihan listrik.</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </tr>
          )}
        </Table>
        {estimasiPembayaran === null && varianceRows.length > 0 && (
          <p className="mt-2 text-[11.5px] text-[#a3690a]">Pilih golongan tarif listrik pada bagian C untuk menghitung estimasi perbandingan.</p>
        )}
        <AnalystNote
          value={inputs.catatanD ?? ""}
          onChange={(v) => onInputChange("catatanD", v)}
          canEdit={canEdit}
          placeholder="Catatan analis untuk analisis tagihan listrik..."
        />
      </Section>

      <Section letter="E" title="Kesimpulan">
        <Paragraphs
          items={[
            "Kesimpulan disusun dengan mempertimbangkan hasil observasi lapangan, verifikasi data mesin produksi, analisis kebutuhan daya listrik, serta kesesuaian dengan data tagihan PLN aktual.",
          ]}
        />
        <ResultBanner
          bg={overall.bg}
          color={overall.color}
          icon={overall.color === "#1a9850" ? "check_circle" : overall.color === "#c1361f" ? "error" : "warning"}
          text={
            varianceRows.length
              ? `${overall.label} — selisih tertinggi terhadap tagihan aktual sebesar ${fmtNum(maxAbsVariance)}%.`
              : "Belum dapat dihitung — belum ada data tagihan listrik."
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
