"use client";

import { capacitySummary, materialNeeds, materialTotals } from "../../../lhvki-summary";
import { TECHNICAL_MODULE_LABELS, type TechnicalModuleKey } from "../../../status";
import { fmtNum, type AnalysisData } from "../analysis-types";
import { Paragraphs, Section, StatusPill, Table, Td } from "./shared";

const num = (n: number | null, digits = 2) => (n === null ? "—" : fmtNum(n, digits));

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  SESUAI: { label: "Sesuai", bg: "#e2f7ea", color: "#1a9850" },
  TIDAK_SESUAI: { label: "Tidak Sesuai", bg: "#fbe4de", color: "#c1361f" },
  PENDING: { label: "Belum Dianalisis", bg: "#f2ece5", color: "#8a7565" },
};

/**
 * Ringkasan Analisis Teknis untuk LHVKI — the four figures Permenperin 27/2025 Pasal 32 ayat (3)
 * huruf c–f requires, gathered from the Kapasitas Produksi and Kebutuhan Bahan Baku modules.
 */
export function LhvkiSummaryPanel({ data, moduleKeys }: { data: AnalysisData; moduleKeys: readonly TechnicalModuleKey[] }) {
  const capacity = capacitySummary(data.capacity, data.technicalAnalysisData.kapasitas?.inputs);
  const totals = materialTotals(materialNeeds(data.rawMaterialConversion, data.capacity, data.technicalAnalysisData, data.rawMaterialUsage ?? []));

  return (
    <div className="flex flex-col gap-3.5">
      <Section title="Ringkasan Hasil Analisis Teknis untuk LHVKI">
        <Paragraphs
          items={[
            "Sesuai Pasal 32 ayat (3) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, LHVKI paling sedikit memuat kapasitas produksi per tahun sesuai Perizinan Berusaha dan sesuai hasil VKI (huruf c dan d), serta kebutuhan bahan baku dan/atau bahan penolong dalam 1 (satu) tahun sesuai kapasitas produksi dan sesuai hasil VKI (huruf e dan f). Angka di bawah dihimpun dari modul Kapasitas Produksi dan Kebutuhan Bahan Baku.",
          ]}
        />
      </Section>

      <Section letter="A" title="Kapasitas Produksi per Tahun (Pasal 32 ayat (3) huruf c dan d)">
        <Table headers={["No", "Jenis Produk", "Sesuai Perizinan Berusaha", "Sesuai Hasil VKI", "Satuan", "Selisih"]} minWidth={760}>
          {capacity.map((row, i) => (
            <tr key={row.id}>
              <Td>{i + 1}</Td>
              <Td strong>{row.jenisProduk || "—"}</Td>
              <Td>{num(row.izin)}</Td>
              <Td strong>{num(row.vki)}</Td>
              <Td>{row.satuan || "—"}</Td>
              <Td>{row.selisihPct === null ? "—" : `${row.selisihPct >= 0 ? "+" : ""}${fmtNum(row.selisihPct, 1)}%`}</Td>
            </tr>
          ))}
          {capacity.length === 0 && (
            <tr>
              <td colSpan={6} className="border border-[#efe2d4] px-3 py-2 text-[#8a7565]">Belum ada data kapasitas perizinan.</td>
            </tr>
          )}
        </Table>
      </Section>

      <Section letter="B" title="Kebutuhan Bahan Baku dan/atau Bahan Penolong 1 Tahun (Pasal 32 ayat (3) huruf e dan f)">
        <Table headers={["No", "Bahan Baku dan/atau Bahan Penolong", "HS Code", "Sesuai Kapasitas Produksi", "Sesuai Hasil VKI", "Rencana Kebutuhan (Permohonan)", "Satuan"]} minWidth={860}>
          {totals.map((row, i) => (
            <tr key={`${row.hsCode}-${row.bahanBaku}-${row.satuan}`}>
              <Td>{i + 1}</Td>
              <Td strong>{row.bahanBaku || "—"}</Td>
              <Td>{row.hsCode || "—"}</Td>
              <Td>{num(row.izin)}</Td>
              <Td strong>{num(row.vki)}</Td>
              <Td>{num(row.permohonan)}</Td>
              <Td>{row.satuan || "—"}</Td>
            </tr>
          ))}
          {totals.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-[#efe2d4] px-3 py-2 text-[#8a7565]">Belum ada data konversi bahan baku.</td>
            </tr>
          )}
        </Table>
      </Section>

      <Section letter="C" title="Hasil per Modul Analisis">
        <Table headers={["No", "Modul Analisis", "Hasil"]}>
          {moduleKeys.map((key, i) => {
            const pill = STATUS_PILL[data.technicalAnalysisData[key]?.status ?? "PENDING"] ?? STATUS_PILL.PENDING;
            return (
              <tr key={key}>
                <Td>{i + 1}</Td>
                <Td>{TECHNICAL_MODULE_LABELS[key]}</Td>
                <td className="border border-[#efe2d4] px-3 py-2">
                  <StatusPill label={pill.label} bg={pill.bg} color={pill.color} />
                </td>
              </tr>
            );
          })}
        </Table>
      </Section>
    </div>
  );
}
