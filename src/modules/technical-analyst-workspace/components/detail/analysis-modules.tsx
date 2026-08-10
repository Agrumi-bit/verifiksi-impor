"use client";

import { type AnalysisData, fmtNum, parseNumeric } from "./analysis-types";

type ModuleContentProps = {
  data: AnalysisData;
  inputs: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  canEdit: boolean;
};

function NumberField({
  label,
  unit,
  value,
  onChange,
  canEdit,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  canEdit: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-[#594138]">
        {label} {unit ? `(${unit})` : ""}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={!canEdit}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full rounded-lg border border-[#f0ded0] bg-[#faf7f4] px-3 py-2 text-[13px] text-[#261813] outline-none disabled:opacity-60"
      />
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#f0ded0]">
      <table className="w-full min-w-[600px] text-left text-[12.5px]">
        <thead>
          <tr className="bg-[#fdf5f2] text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const VARIANCE_TARIFF_OPTIONS = ["I-3", "I-4", "B-3", "P-2"];

function varianceLabel(pct: number | null): { label: string; color: string } {
  if (pct === null) return { label: "—", color: "#a68f80" };
  const abs = Math.abs(pct);
  if (abs <= 10) return { label: "Sangat Sesuai", color: "#1a9850" };
  if (abs <= 25) return { label: "Masih Wajar", color: "#b3650c" };
  if (abs <= 50) return { label: "Perlu Klarifikasi", color: "#e0662e" };
  return { label: "Perlu Verifikasi", color: "#c1361f" };
}

export function ListrikModuleContent({ data, inputs, onInputChange, canEdit }: ModuleContentProps) {
  const machineRows = data.machines.map((m) => {
    const power = parseNumeric(m.power);
    const jumlah = parseNumeric(m.quantity);
    const waktu = parseNumeric(m.waktuBeroperasi);
    const dailyKwh = power !== null && jumlah !== null && waktu !== null ? power * jumlah * waktu : null;
    return { ...m, power, jumlah, waktu, dailyKwh };
  });
  const totalDailyKwh = machineRows.reduce((sum, m) => sum + (m.dailyKwh ?? 0), 0);
  const estimatedMonthlyKwh = totalDailyKwh > 0 ? totalDailyKwh * 26 : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Estimasi Pemakaian Berdasarkan Data Mesin</div>
        <Table headers={["Mesin", "Power", "Jumlah", "Jam Operasi/hari", "Estimasi kWh/hari"]}>
          {machineRows.map((m) => (
            <tr key={m.id} className="border-t border-[#f5ebe1]">
              <td className="px-3 py-2 font-semibold text-[#2b2420]">{m.nama || "—"}</td>
              <td className="px-3 py-2">{m.power ?? "—"}</td>
              <td className="px-3 py-2">{m.jumlah ?? "—"}</td>
              <td className="px-3 py-2">{m.waktu ?? "—"}</td>
              <td className="px-3 py-2 font-semibold">{fmtNum(m.dailyKwh)}</td>
            </tr>
          ))}
        </Table>
        <div className="mt-2 text-[12px] text-[#8a7565]">
          Total estimasi: {fmtNum(totalDailyKwh)} kWh/hari · asumsi 26 hari kerja/bulan → {fmtNum(estimatedMonthlyKwh)} kWh/bulan
        </div>
      </div>

      <div>
        <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Perbandingan dengan Tagihan Aktual</div>
        <Table headers={["Bulan", "kWh Aktual", "Selisih vs Estimasi", "Status"]}>
          {data.electricityMonths.map((month) => {
            const actual = parseNumeric(month.kwh);
            const variancePct =
              actual !== null && estimatedMonthlyKwh ? ((actual - estimatedMonthlyKwh) / estimatedMonthlyKwh) * 100 : null;
            const meta = varianceLabel(variancePct);
            return (
              <tr key={month.id} className="border-t border-[#f5ebe1]">
                <td className="px-3 py-2 font-semibold text-[#2b2420]">{month.bulan || "—"}</td>
                <td className="px-3 py-2">{actual !== null ? fmtNum(actual) : "—"}</td>
                <td className="px-3 py-2">{variancePct !== null ? `${fmtNum(variancePct)}%` : "—"}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ color: meta.color, background: `${meta.color}1a` }}>
                    {meta.label}
                  </span>
                </td>
              </tr>
            );
          })}
          {data.electricityMonths.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-[#a68f80]">
                Belum ada data tagihan listrik.
              </td>
            </tr>
          )}
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold text-[#594138]">Golongan Tarif</div>
          <select
            value={inputs.tarif ?? ""}
            disabled={!canEdit}
            onChange={(e) => onInputChange("tarif", e.target.value)}
            className="w-full rounded-lg border border-[#f0ded0] bg-[#faf7f4] px-3 py-2 text-[13px] text-[#261813] outline-none disabled:opacity-60"
          >
            <option value="">Pilih golongan tarif</option>
            {VARIANCE_TARIFF_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <NumberField
          label="Sumber Energi Alternatif"
          value={inputs.sumberEnergi ?? ""}
          onChange={(v) => onInputChange("sumberEnergi", v)}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}

export function KapasitasModuleContent({ data }: ModuleContentProps) {
  const machineRows = data.machines.map((m) => ({ ...m, perHari: parseNumeric(m.kapasitasPerHari) }));
  const withCapacity = machineRows.filter((m) => m.perHari !== null);
  const bottleneck = withCapacity.length > 0 ? withCapacity.reduce((min, m) => (m.perHari! < min.perHari! ? m : min)) : null;
  const monthlyCapacity = bottleneck?.perHari ? bottleneck.perHari * 26 : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Kapasitas Produksi per Mesin</div>
        <Table headers={["Mesin", "Kapasitas/Jam", "Jam Operasi/hari", "Kapasitas/hari"]}>
          {machineRows.map((m) => (
            <tr key={m.id} className={`border-t border-[#f5ebe1] ${bottleneck?.id === m.id ? "bg-[#fbe4de]" : ""}`}>
              <td className="px-3 py-2 font-semibold text-[#2b2420]">
                {m.nama || "—"}
                {bottleneck?.id === m.id && <span className="ml-1.5 text-[10px] font-bold text-[#c1361f]">(Bottleneck)</span>}
              </td>
              <td className="px-3 py-2">
                {m.kapasitasJam || "—"} {m.kapasitasJamSatuan}
              </td>
              <td className="px-3 py-2">{m.waktuBeroperasi || "—"}</td>
              <td className="px-3 py-2 font-semibold">{m.kapasitasPerHari || "—"}</td>
            </tr>
          ))}
        </Table>
        <div className="mt-2 text-[12px] text-[#8a7565]">
          Kapasitas lini (bottleneck): {fmtNum(bottleneck?.perHari ?? null)}/hari · asumsi 26 hari kerja/bulan → {fmtNum(monthlyCapacity)}/bulan
        </div>
      </div>

      <div>
        <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Rencana Produksi (dari Permohonan)</div>
        <Table headers={["Produk", "HS Code", "Volume Rencana", "Satuan"]}>
          {data.productionQtyRencana.map((item) => (
            <tr key={item.key} className="border-t border-[#f5ebe1]">
              <td className="px-3 py-2 font-semibold text-[#2b2420]">{item.jenisProduk || "—"}</td>
              <td className="px-3 py-2">{item.hsCode || "—"}</td>
              <td className="px-3 py-2">{item.jumlah || "—"}</td>
              <td className="px-3 py-2">{item.satuan || "—"}</td>
            </tr>
          ))}
          {data.productionQtyRencana.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-[#a68f80]">
                Belum ada data rencana produksi.
              </td>
            </tr>
          )}
        </Table>
      </div>
    </div>
  );
}

export function BahanBakuModuleContent({ data, inputs, onInputChange, canEdit }: ModuleContentProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Kebutuhan Bahan Baku (dari Permohonan)</div>
        <Table headers={["Produk", "Bahan Baku", "HS Code", "Kategori", "Volume Kebutuhan", "Rasio Konversi"]}>
          {data.rawMaterialConversion.map((row) => (
            <tr key={row.id} className="border-t border-[#f5ebe1]">
              <td className="px-3 py-2 font-semibold text-[#2b2420]">{row.productName || "—"}</td>
              <td className="px-3 py-2">{row.jenis || "—"}</td>
              <td className="px-3 py-2">{row.hsCode || "—"}</td>
              <td className="px-3 py-2">{row.kategori || "—"}</td>
              <td className="px-3 py-2">
                {row.volumeKebutuhanJumlah || "—"} {row.volumeKebutuhanSatuan}
              </td>
              <td className="px-3 py-2">{row.rasioKonversi || "—"}</td>
            </tr>
          ))}
          {data.rawMaterialConversion.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-[#a68f80]">
                Belum ada data konversi bahan baku.
              </td>
            </tr>
          )}
        </Table>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-[#594138]">Volume Perizinan (dari dokumen fisik yang diverifikasi)</div>
        <textarea
          rows={3}
          value={inputs.volumeIzin ?? ""}
          disabled={!canEdit}
          onChange={(e) => onInputChange("volumeIzin", e.target.value)}
          placeholder="Catat volume perizinan per bahan baku untuk dibandingkan dengan volume permohonan di atas..."
          className="w-full rounded-lg border border-[#f0ded0] bg-[#faf7f4] px-3 py-2 text-[13px] text-[#261813] outline-none disabled:opacity-60"
        />
      </div>
    </div>
  );
}

export function RencanaModuleContent({ inputs, onInputChange, canEdit }: ModuleContentProps) {
  const kebutuhan = parseNumeric(inputs.kebutuhanAktual);
  const rencana = parseNumeric(inputs.rencanaImpor);
  const ratio = kebutuhan && rencana !== null ? rencana / kebutuhan : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField label="Kebutuhan Aktual" unit="unit/tahun" value={inputs.kebutuhanAktual ?? ""} onChange={(v) => onInputChange("kebutuhanAktual", v)} canEdit={canEdit} />
        <NumberField label="Rencana Impor" unit="unit/tahun" value={inputs.rencanaImpor ?? ""} onChange={(v) => onInputChange("rencanaImpor", v)} canEdit={canEdit} />
      </div>
      <div className="rounded-lg border border-[#f0ded0] bg-[#fdf5f2] p-3 text-[13px]">
        Rasio Rencana Impor / Kebutuhan Aktual: <span className="font-bold">{ratio !== null ? `${fmtNum(ratio, 2)}x` : "—"}</span>
        {ratio !== null && (
          <span className={`ml-2 font-semibold ${ratio <= 1.2 ? "text-[#1a9850]" : "text-[#c1361f]"}`}>
            {ratio <= 1.2 ? "(dalam batas wajar, ≤1.2x)" : "(melebihi batas wajar 1.2x)"}
          </span>
        )}
      </div>
    </div>
  );
}

export function PenyimpananModuleContent({ inputs, onInputChange, canEdit }: ModuleContentProps) {
  const kapasitas = parseNumeric(inputs.kapasitasGudang);
  const stok = parseNumeric(inputs.stokTerkini) ?? 0;
  const rencana = parseNumeric(inputs.rencanaImpor) ?? 0;
  const utilisasi = kapasitas ? ((stok + rencana) / kapasitas) * 100 : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumberField label="Kapasitas Gudang" unit="m³" value={inputs.kapasitasGudang ?? ""} onChange={(v) => onInputChange("kapasitasGudang", v)} canEdit={canEdit} />
        <NumberField label="Stok Terkini" unit="m³" value={inputs.stokTerkini ?? ""} onChange={(v) => onInputChange("stokTerkini", v)} canEdit={canEdit} />
        <NumberField label="Rencana Impor" unit="m³" value={inputs.rencanaImpor ?? ""} onChange={(v) => onInputChange("rencanaImpor", v)} canEdit={canEdit} />
      </div>
      <div className="rounded-lg border border-[#f0ded0] bg-[#fdf5f2] p-3 text-[13px]">
        Utilisasi Gudang: <span className="font-bold">{utilisasi !== null ? `${fmtNum(utilisasi)}%` : "—"}</span>
        {utilisasi !== null && (
          <span className={`ml-2 font-semibold ${utilisasi <= 100 ? "text-[#1a9850]" : "text-[#c1361f]"}`}>
            {utilisasi <= 100 ? "(kapasitas mencukupi)" : "(melebihi kapasitas gudang)"}
          </span>
        )}
      </div>
    </div>
  );
}

export function ModalModuleContent({ inputs, onInputChange, canEdit }: ModuleContentProps) {
  const nilaiImpor = parseNumeric(inputs.nilaiImpor);
  const modalKerja = parseNumeric(inputs.modalKerja);
  const ratio = nilaiImpor && modalKerja !== null ? modalKerja / nilaiImpor : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField label="Nilai Impor" unit="Rp" value={inputs.nilaiImpor ?? ""} onChange={(v) => onInputChange("nilaiImpor", v)} canEdit={canEdit} />
        <NumberField label="Modal Kerja" unit="Rp" value={inputs.modalKerja ?? ""} onChange={(v) => onInputChange("modalKerja", v)} canEdit={canEdit} />
      </div>
      <div className="rounded-lg border border-[#f0ded0] bg-[#fdf5f2] p-3 text-[13px]">
        Rasio Modal Kerja / Nilai Impor: <span className="font-bold">{ratio !== null ? `${fmtNum(ratio, 2)}x` : "—"}</span>
        {ratio !== null && (
          <span className={`ml-2 font-semibold ${ratio >= 1 ? "text-[#1a9850]" : "text-[#c1361f]"}`}>
            {ratio >= 1 ? "(modal kerja mencukupi)" : "(modal kerja kurang dari nilai impor)"}
          </span>
        )}
      </div>
    </div>
  );
}
