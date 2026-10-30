import { buildMerekStage, type KonsumsiStageInput } from "../../konsumsi-stages";
import { formatDate } from "../case-list/format";
import { DataTable, DocumentChip, DocumentStatus, PendingHandover, RequirementTag, StageCard, SummaryChips, TD, VerdictPill } from "./stage-ui";

/** Tahap 4 "Merek & Hubungan Importir" — the Verifikator design's three tables, read only. */
export function MerekStage({ data, handedOver }: { data: KonsumsiStageInput; handedOver: boolean }) {
  const { relations, brands, matrix } = buildMerekStage(data);
  return (
    <>
      <StageCard title="Status Hubungan Importir dengan Pemilik Merek" description="Hubungan API-U terhadap setiap merek seperti yang dinyatakan pemohon, dan kelengkapan dokumen hubungannya.">
        <DataTable
          caption="Status hubungan importir dengan pemilik merek"
          headers={["Merek", "Pemilik Merek", "Negara Pemilik", "Hubungan API-U", "Ditunjuk Oleh", "Kelengkapan", "Status"]}
          empty={relations.length === 0 && "Permohonan ini tidak mencantumkan merek."}
        >
          {relations.map((item, index) => (
            <tr key={`${item.brand.brandId}-${index}`}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{item.brand.brandName}</th>
              <td className={TD}>{item.brand.ownerName ?? "—"}</td>
              <td className={TD}>{item.brand.ownerCountry ?? "—"}</td>
              <td className={TD}>{item.relation}</td>
              <td className={TD}>{item.appointedBy}</td>
              <td className={TD}>
                {item.completeness.required === 0 ? (
                  <span className="text-[12.5px] text-[#64748B]">Tidak ada dokumen hubungan wajib</span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="tabular-nums">{item.completeness.uploaded}/{item.completeness.required} dokumen</span>
                    <span className="text-[11.5px] text-[#64748B]">{item.brand.requiredDocuments.join(", ")}</span>
                  </div>
                )}
              </td>
              <td className={TD}><VerdictPill verdict={item.status} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>

      <StageCard title="Data Merek" description="Bukti merek dari Merek Management; masa berlaku dinilai pada Tanggal Pengajuan (aturan 9 bulan Tanda Pendaftaran Merek, Pasal 37 ayat (7)).">
        <DataTable
          caption="Data merek"
          minWidth={1150}
          headers={["Nama Merek", "Pemilik", "Negara", "Jenis Dokumen Merek", "Nomor", "Tgl Registrasi / Terbit", "Masa Berlaku", "Status Dokumen", "Status Verifikasi"]}
          empty={brands.length === 0 && "Belum ada merek."}
        >
          {brands.map(({ brand, validity, status }, index) => (
            <tr key={`${brand.brandId}-${index}`}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{brand.brandName}</th>
              <td className={TD}>{brand.ownerName ?? "—"}</td>
              <td className={TD}>{brand.ownerCountry ?? "—"}</td>
              <td className={TD}>{brand.evidenceTypeLabel}</td>
              <td className={`${TD} font-mono text-[12.5px]`}>{brand.registrationNumber ?? "—"}</td>
              <td className={TD}>{formatDate(brand.registrationDate)}</td>
              <td className={TD}>{formatDate(brand.registrationExpiryDate)}</td>
              <td className={TD}>
                <div className="flex flex-col items-start gap-1">
                  <VerdictPill verdict={validity} />
                  {validity.detail && <span className="text-[11.5px] text-[#64748B]">{validity.detail}</span>}
                </div>
              </td>
              <td className={TD}><VerdictPill verdict={status} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>

      <StageCard
        title="Matriks Pemeriksaan Merek & Hubungan Importir"
        description="Setiap dokumen merek dengan status yang dicatat Verifikator, tipe wajib dan dasar regulasinya. Compliance hanya menampilkan."
        aside={<SummaryChips rows={matrix.map((item) => item.row)} />}
      >
        <div className="px-6 pb-4"><PendingHandover handedOver={handedOver} /></div>
        <DataTable
          caption="Matriks pemeriksaan merek dan hubungan importir"
          minWidth={1200}
          headers={["No.", "Parameter", "Merek", "Hubungan API-U", "Dokumen", "Status Verifikasi", "Tipe Regulasi", "Note Regulasi"]}
          empty={matrix.length === 0 && "Belum ada dokumen merek pada permohonan ini."}
        >
          {matrix.map(({ brandName, relation, row }, index) => (
            <tr key={row.key}>
              <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
              <th scope="row" className={`${TD} text-left font-semibold`}>{row.label}</th>
              <td className={TD}>{brandName}</td>
              <td className={TD}>{relation}</td>
              <td className={TD}><DocumentChip document={row.document} /></td>
              <td className={TD}><DocumentStatus row={row} /></td>
              <td className={TD}><RequirementTag value={row.requirement} /></td>
              <td className={`${TD} max-w-[240px] text-[12.5px] text-[#475569]`}>{row.regulation}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
    </>
  );
}
