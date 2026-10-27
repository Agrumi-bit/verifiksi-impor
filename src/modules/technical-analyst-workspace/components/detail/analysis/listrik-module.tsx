"use client";

import { useQuery } from "@tanstack/react-query";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { computeListrik, DEFAULT_HARI_OPERASI_PER_BULAN, LISTRIK_TEXT } from "../../../listrik-calc";
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
  onMarkSesuaiCatatan,
  onSubmit,
  canEdit,
  submitting,
}: ModuleProps) {
  const { data: tariffs, isLoading: tariffsLoading } = useElectricityTariffs();
  const selectedTariff = tariffs?.find((t) => t.id === inputs.tarifId) ?? null;
  const selectedTariffNominal = parseNumeric(selectedTariff?.tarifPerKwh);
  // Same calculation as the printed Laporan Analisis Teknis (listrik-calc.ts).
  const {
    machineRows,
    totalPower,
    totalDailyConsumption,
    rataRataBeban,
    nonOperasional,
    totalKebutuhanHarian,
    hariOperasiPerBulan,
    totalMonthlyConsumption,
    estimasiPembayaran,
    varianceRows,
    maxAbsVariance,
    overall,
  } = computeListrik(data.machines, data.electricityMonths, inputs, selectedTariffNominal);

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
            LISTRIK_TEXT.dasar,
          ]}
        />
        <Formula>{LISTRIK_TEXT.dasarFormula}</Formula>
      </Section>

      <Section letter="B" title="Data Mesin dan Perhitungan Daya">
        <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Tabel Data Daya Mesin</div>
        <Table headers={["Mesin", "Quantity", "Daya/Unit (kW)", "Total Daya (kW)", "Jam Operasi", "Daya Digunakan/Hari (kWh)"]}>
          {machineRows.map((m) => (
            <tr key={m.id}>
              <Td strong>{m.nama || "—"}</Td>
              <Td>{m.jumlah ?? "—"} pcs</Td>
              <Td>
                {m.power !== null ? `${fmtNum(m.power, 2)} kW` : "—"}
                {m.powerSatuan && !/^kw/i.test(m.powerSatuan.trim()) && (
                  <span className="block text-[10.5px] text-[#a68f80]">
                    data: {data.machines.find((x) => x.id === m.id)?.power} {m.powerSatuan}
                  </span>
                )}
              </Td>
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
            LISTRIK_TEXT.beban,
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
            label="Jumlah Hari Operasi per Bulan"
            value={inputs.hariOperasiPerBulan ?? ""}
            onChange={(v) => onInputChange("hariOperasiPerBulan", v.replace(/[^\d.,]/g, ""))}
            canEdit={canEdit}
            unit="hari/bulan"
            placeholder={String(DEFAULT_HARI_OPERASI_PER_BULAN)}
          />
        </div>
        <Formula>
          {fmtNum(totalDailyConsumption, 2)} kWh/hari × 85% = {fmtNum(rataRataBeban, 2)} kWh (mesin) + {fmtNum(nonOperasional, 2)} kWh (non-operasional, 15%) = {fmtNum(totalKebutuhanHarian, 2)} kWh/hari
        </Formula>
        <HeroStat
          label={`Total Power Consumption Perusahaan per Bulan (${fmtNum(hariOperasiPerBulan, 2)} hari operasi)`}
          value={`${fmtNum(totalMonthlyConsumption, 0)} kWh`}
        />

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
            LISTRIK_TEXT.tagihan,
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
        onMarkSesuaiCatatan={onMarkSesuaiCatatan}
        onSubmit={onSubmit}
        canEdit={canEdit}
        submitting={submitting}
      />
    </div>
  );
}
