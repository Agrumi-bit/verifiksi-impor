import type { DocumentRow } from "../../document-matrix";
import { buildLabelStage, buildUjiMutuStage, documentAgeMonths, type KonsumsiStageInput } from "../../konsumsi-stages";
import { formatCalendarDate } from "../case-list/format";
import { DataTable, DocumentChip, DocumentStatus, PendingHandover, RequirementTag, StageCard, SummaryChips, TD, VerdictPill } from "./stage-ui";

function DocumentMatrix({ title, rows }: { title: string; rows: DocumentRow[] }) {
  return (
    <StageCard title={title} description="Status yang dicatat Verifikator, tipe wajib dan dasar regulasinya. Compliance hanya menampilkan." aside={<SummaryChips rows={rows} />}>
      <DataTable
        caption={title}
        minWidth={1050}
        headers={["No.", "Parameter", "Dokumen", "Status Verifikasi", "Tipe Regulasi", "Note Regulasi"]}
        empty={rows.length === 0 && "Belum ada dokumen pada tahap ini."}
      >
        {rows.map((row, index) => (
          <tr key={row.key}>
            <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
            <th scope="row" className={`${TD} text-left font-semibold`}>{row.label}</th>
            <td className={TD}><DocumentChip document={row.document} /></td>
            <td className={TD}><DocumentStatus row={row} /></td>
            <td className={TD}><RequirementTag value={row.requirement} /></td>
            <td className={`${TD} max-w-[260px] text-[12.5px] text-[#475569]`}>{row.regulation}</td>
          </tr>
        ))}
      </DataTable>
    </StageCard>
  );
}

/** Tahap 7 "Uji Mutu" — one certificate per Merek × Sub Kelompok; age judged by the production 6-month window. */
export function UjiMutuStage({ data, handedOver }: { data: KonsumsiStageInput; handedOver: boolean }) {
  const rows = buildUjiMutuStage(data);
  return (
    <>
      <StageCard
        title="Daftar Hasil Uji Mutu"
        description="Sertifikat diajukan paling lama 6 bulan sejak diterbitkan (Pasal 37), dinilai pada Tanggal Pengajuan."
      >
        <div className="px-6 pb-4"><PendingHandover handedOver={handedOver} /></div>
        <DataTable
          caption="Daftar hasil uji mutu"
          minWidth={1300}
          headers={["Merek", "Kelompok", "Sub Kelompok", "HS Tercover", "No. Sertifikat", "Laboratorium", "Tanggal Terbit", "Umur Dokumen", "Status", "Verifikasi"]}
          empty={rows.length === 0 && "Permohonan ini belum memuat produk."}
        >
          {rows.map((row) => {
            const age = documentAgeMonths(row.certificate?.issueDate ?? null, data.submittedAt);
            return (
              <tr key={row.key}>
                <th scope="row" className={`${TD} text-left font-semibold`}>{row.brandName}</th>
                <td className={TD}>{row.kelompok ?? "—"}</td>
                <td className={TD}>{row.subKelompok ?? "—"}</td>
                <td className={`${TD} font-mono text-[12px]`}>{row.hsCodes.join(", ")}</td>
                <td className={`${TD} font-mono text-[12.5px]`}>{row.certificate?.certificateNumber ?? "—"}</td>
                <td className={TD}>{row.certificate?.laboratory ?? "—"}</td>
                <td className={TD}>{formatCalendarDate(row.certificate?.issueDate ?? null)}</td>
                <td className={`${TD} tabular-nums`}>{age === null ? "—" : `${age} bulan`}</td>
                <td className={TD}>
                  <div className="flex flex-col items-start gap-1">
                    <VerdictPill verdict={row.window} />
                    <span className="max-w-[220px] text-[11.5px] text-[#64748B]">{row.window.detail}</span>
                  </div>
                </td>
                <td className={TD}><DocumentStatus row={row.document} /></td>
              </tr>
            );
          })}
        </DataTable>
      </StageCard>
      <DocumentMatrix title="Matriks Pemeriksaan Uji Mutu" rows={rows.flatMap((row) => (row.document ? [row.document] : []))} />
    </>
  );
}

/** Tahap 8 "Pernyataan Label" — one statement and one label documentation for the whole application. */
export function LabelStage({ data, handedOver }: { data: KonsumsiStageInput; handedOver: boolean }) {
  const { statement, documentation, groups, matrix } = buildLabelStage(data);
  return (
    <>
      <StageCard title="Surat Pernyataan Label Berbahasa Indonesia" description="Pernyataan pemohon bahwa produk yang diimpor berlabel Bahasa Indonesia.">
        <div className="flex flex-wrap items-center gap-6 border-t border-[#EEF2F6] px-6 py-4">
          <DocumentChip document={statement?.document ?? null} />
          <DocumentStatus row={statement} />
          <PendingHandover handedOver={handedOver} />
        </div>
      </StageCard>

      <StageCard
        title="Daftar Dokumentasi Label Produk"
        description="Pemohon mengunggah satu dokumentasi label yang mencakup seluruh Merek × Sub Kelompok di bawah; statusnya sama untuk setiap baris."
      >
        <DataTable
          caption="Daftar dokumentasi label produk"
          minWidth={1050}
          headers={["Merek", "Kelompok", "Sub Kelompok", "HS Tercover", "Dokumentasi Label", "Status"]}
          empty={groups.length === 0 && "Permohonan ini belum memuat produk."}
        >
          {groups.map((group) => (
            <tr key={group.key}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{group.brandName}</th>
              <td className={TD}>{group.kelompok ?? "—"}</td>
              <td className={TD}>{group.subKelompok ?? "—"}</td>
              <td className={`${TD} font-mono text-[12px]`}>{group.hsCodes.join(", ")}</td>
              <td className={TD}><DocumentChip document={documentation?.document ?? null} /></td>
              <td className={TD}><DocumentStatus row={documentation} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <DocumentMatrix title="Matriks Pemeriksaan Label" rows={matrix} />
    </>
  );
}
