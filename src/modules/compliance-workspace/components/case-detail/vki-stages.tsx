import { buildAnalisisStage, buildBahanBakuStage, buildKapasitasStage, buildMesinStage, buildPenjualanStage, buildPernyataanStage, buildProdukStage, buildAlurProsesStage, buildListrikStage, buildTenagaKerjaStage, formatQuantity, type AnalysisCell, type AnalysisPart, type VkiCheck, type VkiStageInput } from "../../vki-stages";
import { formatCalendarDate } from "../case-list/format";
import { DocumentMatrix } from "./mutu-label-stages";
import { DataTable, DocumentChip, PendingHandover, RequirementTag, StageCard, TD, VerdictPill } from "./stage-ui";

/*
 * Tahap 5–14 of a VKI case, read only: what the applicant declared, the Verifikator's document
 * status and the Technical Analyst's module decisions — in the same cards and tables as the VIU stages.
 */

type StageProps = { data: VkiStageInput; handedOver: boolean };

/** The stage's check matrix: each data item with its result, Tipe Regulasi and Note Regulasi (Permenperin 27/2025). */
function VkiCheckMatrix({ title, checks }: { title: string; checks: VkiCheck[] }) {
  return (
    <StageCard title={title} description="Hasil per data yang dipersyaratkan Pasal 30 ayat (2) Permenperin Nomor 27 Tahun 2025, dari catatan Verifikator.">
      <DataTable caption={title} minWidth={1100} headers={["No.", "Parameter Pemeriksaan", "Objek", "Hasil / Keterangan", "Status", "Tipe Regulasi", "Note Regulasi"]}>
        {checks.map((item, index) => (
          <tr key={item.parameter}>
            <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
            <th scope="row" className={`${TD} max-w-[300px] text-left font-semibold`}>{item.parameter}</th>
            <td className={TD}>{item.object}</td>
            <td className={`${TD} max-w-[320px]`}>{item.result}</td>
            <td className={TD}><VerdictPill verdict={item.verdict} /></td>
            <td className={TD}><RequirementTag value={item.type} /></td>
            <td className={`${TD} text-[12.5px] text-[#475569]`}>{item.regulation}</td>
          </tr>
        ))}
      </DataTable>
    </StageCard>
  );
}

/** Tahap 5 "Produk" — the products with the Verifikator's decision, the raw materials and the conversion ratios. */
export function ProdukStage({ data, handedOver }: StageProps) {
  const stage = buildProdukStage(data);
  const { conversions } = stage;
  return (
    <>
      <PendingHandover handedOver={handedOver} />
      <StageCard title="Produk" description={`${stage.products.length} produk yang dihasilkan, dengan keputusan Verifikator per produk.`}>
        <DataTable
          caption="Produk"
          minWidth={1100}
          headers={["No.", "Jenis Produk", "Kategori", "HS Code", "Uraian HS", "Estimasi Volume", "Status Verifikasi"]}
          empty={stage.products.length === 0 && "Pemohon belum mencantumkan produk."}
        >
          {stage.products.map((product, index) => (
            <tr key={product.id}>
              <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
              <th scope="row" className={`${TD} max-w-[320px] text-left font-semibold`}>
                {product.name}
                {product.description && <span className="block text-[11.5px] font-normal text-[#64748B]">{product.description}</span>}
              </th>
              <td className={TD}>{product.category ?? "—"}</td>
              <td className={`${TD} font-mono text-[12.5px]`}>{product.hsCode ?? "—"}</td>
              <td className={`${TD} max-w-[320px] text-[12.5px] text-[#475569]`}>{product.hsDescription ?? "—"}</td>
              <td className={`${TD} text-right tabular-nums`}>{product.volume}</td>
              <td className={TD}>
                <div className="flex flex-col items-start gap-1">
                  <VerdictPill verdict={product.verdict} />
                  {product.note && <span className="max-w-[220px] text-[11.5px] text-[#64748B]">{product.note}</span>}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <StageCard title="Bahan Baku" description={`${stage.materials.length} bahan baku/penolong, seperti yang diajukan pemohon.`}>
        <DataTable
          caption="Bahan baku"
          minWidth={1000}
          headers={["No.", "Bahan Baku / Penolong", "HS Code", "Uraian HS", "Digunakan untuk Produk"]}
          empty={stage.materials.length === 0 && "Pemohon belum mencantumkan bahan baku."}
        >
          {stage.materials.map((material, index) => (
            <tr key={material.id}>
              <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
              <th scope="row" className={`${TD} max-w-[320px] text-left font-semibold`}>
                {material.name}
                {material.description && <span className="block text-[11.5px] font-normal text-[#64748B]">{material.description}</span>}
              </th>
              <td className={`${TD} font-mono text-[12.5px]`}>{material.hsCode ?? "—"}</td>
              <td className={`${TD} max-w-[320px] text-[12.5px] text-[#475569]`}>{material.hsDescription ?? "—"}</td>
              <td className={TD}>{material.usedFor ?? "—"}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <StageCard title="Rasio Konversi Bahan Baku ke Produk" description="Kebutuhan bahan baku/penolong terhadap volume produksi per jenis produk.">
        {(conversions.verdict || conversions.conclusion) && (
          <div className="flex flex-wrap items-start gap-2 px-6 pb-3 text-[12.5px] text-[#475569]">
            {conversions.verdict && <VerdictPill verdict={conversions.verdict} />}
            {conversions.conclusion && <span className="flex-1 whitespace-pre-line">{conversions.conclusion}</span>}
          </div>
        )}
        <DataTable
          caption="Rasio konversi bahan baku ke produk"
          minWidth={1200}
          headers={["No.", "Jenis Produk", "Volume Produksi", "Bahan Baku / Penolong", "HS Code", "Kategori", "Volume Kebutuhan", "Rasio Konversi", "Keterangan"]}
          empty={conversions.rows.length === 0 && "Rasio konversi belum diisi."}
        >
          {conversions.rows.map((row, index) => (
            <tr key={row.id}>
              <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
              <th scope="row" className={`${TD} text-left font-semibold`}>{row.product}</th>
              <td className={`${TD} text-right tabular-nums`}>{row.production}</td>
              <td className={TD}>{row.material}</td>
              <td className={`${TD} font-mono text-[12.5px]`}>{row.hsCode ?? "—"}</td>
              <td className={TD}>{row.category ?? "—"}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.need}</td>
              <td className={`${TD} font-semibold tabular-nums`}>{row.ratio}</td>
              <td className={`${TD} max-w-[240px] text-[12.5px] text-[#475569]`}>{row.note ?? "—"}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <VkiCheckMatrix title="Matriks Pemeriksaan Produk" checks={stage.checks} />
    </>
  );
}

/** Tahap 6 "Alur Proses Produksi" — the production-flow drawing and its status. */
export function AlurProsesStage({ data, handedOver }: StageProps) {
  const stage = buildAlurProsesStage(data);
  return (
    <div className="flex flex-col gap-2">
      <PendingHandover handedOver={handedOver} />
      <DocumentMatrix title="Matriks Pemeriksaan Alur Proses Produksi" rows={stage.documents} />
    </div>
  );
}

/** Tahap 7 "Pemakaian Listrik" — the last 3 months' electricity bills, with their total and average. */
export function ListrikStage({ data, handedOver }: StageProps) {
  const stage = buildListrikStage(data);
  return (
    <>
      <StageCard
        title="Pemakaian Listrik"
        description="Bukti pembayaran listrik 3 (tiga) bulan sebelumnya."
        aside={
          <dl className="grid grid-cols-2 gap-x-6 text-right text-[13px]">
            <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Total</dt>
            <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Rata-rata / Bulan</dt>
            <dd className="font-semibold tabular-nums">{stage.totalKwh}</dd>
            <dd className="font-semibold tabular-nums">{stage.averageKwh}</dd>
          </dl>
        }
      >
        <DataTable caption="Pemakaian listrik" minWidth={800} headers={["Bulan", "Pemakaian (kWh)", "Nominal", "Bukti Pembayaran"]} empty={stage.electricity.length === 0 && "Data listrik belum diisi."}>
          {stage.electricity.map((month, index) => (
            <tr key={`${month.month}-${index}`}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{month.month ?? "—"}</th>
              <td className={`${TD} tabular-nums`}>{month.kwh ?? "—"}</td>
              <td className={`${TD} tabular-nums`}>{month.nominal ?? "—"}</td>
              <td className={TD}><DocumentChip document={month.document} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>

      <div className="flex flex-col gap-2">
        <PendingHandover handedOver={handedOver} />
        <DocumentMatrix title="Matriks Pemeriksaan Pemakaian Listrik" rows={stage.documents} />
      </div>
    </>
  );
}

/**
 * Tahap 8 "Data Mesin" — the machines, their capacity (per day / per year, with the line's
 * bottleneck) and their power use, computed as the Verifikator and Technical Analyst compute them.
 */
export function MesinStage({ data }: StageProps) {
  const stage = buildMesinStage(data);
  return (
    <>
      <StageCard title="Data Mesin" description={`${stage.machines.length} jenis mesin · ${stage.totalUnits.toLocaleString("id-ID")} unit, seperti yang diajukan pemohon.`}>
        <DataTable caption="Data mesin" minWidth={1200} headers={["No.", "Nama Mesin", "Proses", "Merek / Model", "Tahun", "Jumlah", "Input → Output", "Kondisi"]} empty={stage.machines.length === 0 && "Data mesin belum diisi."}>
          {stage.machines.map((machine, index) => (
            <tr key={machine.id}>
              <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
              <th scope="row" className={`${TD} text-left font-semibold`}>{machine.nama || "—"}</th>
              <td className={TD}>{machine.proses || "—"}</td>
              <td className={TD}>{[machine.merk, machine.model].filter(Boolean).join(" · ") || "—"}</td>
              <td className={`${TD} tabular-nums`}>{machine.tahun || "—"}</td>
              <td className={`${TD} tabular-nums`}>{[machine.quantity, machine.quantitySatuan].filter(Boolean).join(" ") || "—"}</td>
              <td className={TD}>{[machine.input, machine.output].filter(Boolean).join(" → ") || "—"}</td>
              <td className={TD}>{machine.kondisi || "—"}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>

      <StageCard
        title="Kemampuan Kapasitas Mesin"
        description="Kapasitas/Hari = jumlah × kapasitas/jam × jam operasi; Kapasitas/Tahun = Kapasitas/Hari × hari efektif — sama dengan Verifikasi Mesin Verifikator."
        aside={
          stage.line.machine && (
            <dl className="flex flex-wrap gap-4 text-[13px]">
              <div className="flex flex-col items-end">
                <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Kapasitas Lini / Hari</dt>
                <dd className="font-semibold tabular-nums">{stage.line.perDay}</dd>
              </div>
              <div className="flex flex-col items-end">
                <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Kapasitas Lini / Tahun</dt>
                <dd className="font-semibold tabular-nums">{stage.line.perYear}</dd>
              </div>
            </dl>
          )
        }
      >
        {stage.line.machine && (
          <p className="px-6 pb-3 text-[12.5px] text-[#475569]">
            Bottleneck: <strong>{stage.line.machine}</strong> {stage.line.chosenByAnalyst ? "(dipilih Technical Analyst)" : "(kapasitas harian terkecil)"} — membatasi kapasitas lini produksi.
          </p>
        )}
        <DataTable caption="Kemampuan kapasitas mesin" minWidth={1200} headers={["Nama Mesin", "Proses", "Jumlah", "Kapasitas / Jam", "Jam Operasi / Hari", "Kapasitas / Hari", "Hari Efektif / Tahun", "Kapasitas / Tahun"]} empty={stage.capacity.length === 0 && "Data mesin belum diisi."}>
          {stage.capacity.map((row) => (
            <tr key={row.id} className={row.isBottleneck ? "bg-[#FFF7E6]" : undefined}>
              <th scope="row" className={`${TD} text-left font-semibold`}>
                {row.name}
                {row.isBottleneck && <span className="ml-1.5 rounded bg-[#FDE7C2] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#B45309]">Bottleneck</span>}
              </th>
              <td className={TD}>{row.process ?? "—"}</td>
              <td className={`${TD} tabular-nums`}>{row.quantity ?? "—"}</td>
              <td className={`${TD} tabular-nums`}>{row.perHour ?? "—"}</td>
              <td className={`${TD} tabular-nums`}>{row.hoursPerDay ?? "—"}</td>
              <td className={`${TD} text-right font-medium tabular-nums`}>{row.perDay}</td>
              <td className={`${TD} tabular-nums`}>{row.effectiveDays ?? "—"}</td>
              <td className={`${TD} text-right font-medium tabular-nums`}>{row.perYear}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>

      <StageCard
        title="Penggunaan Daya Power Mesin"
        description="Total Daya = daya per unit × jumlah; Pemakaian/Hari = total daya × jam operasi — sama dengan Analisis Energi Listrik Technical Analyst."
        aside={
          <dl className="flex flex-wrap gap-4 text-[13px]">
            <div className="flex flex-col items-end">
              <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Total Daya Terpasang</dt>
              <dd className="font-semibold tabular-nums">{stage.totalPower}</dd>
            </div>
            <div className="flex flex-col items-end">
              <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Pemakaian / Hari</dt>
              <dd className="font-semibold tabular-nums">{stage.totalPerDay}</dd>
            </div>
          </dl>
        }
      >
        <DataTable caption="Penggunaan daya mesin" minWidth={1000} headers={["Nama Mesin", "Daya / Unit", "Jumlah", "Total Daya", "Jam Operasi / Hari", "Pemakaian / Hari"]} empty={stage.power.length === 0 && "Data mesin belum diisi."}>
          {stage.power.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{row.name}</th>
              <td className={`${TD} text-right tabular-nums`}>{row.powerPerUnit}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.quantity}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.totalPower}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.hoursPerDay}</td>
              <td className={`${TD} text-right font-medium tabular-nums`}>{row.perDay}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <VkiCheckMatrix title="Matriks Pemeriksaan Data Mesin" checks={stage.checks} />
    </>
  );
}

type ProductionSection = ReturnType<typeof buildKapasitasStage>["previous" | "plan"];

/** One production period: per product quantity with the Verifikator's decision, the total and the section's conclusion. */
function ProductionTable({ title, description, section, growth }: { title: string; description: string; section: ProductionSection; growth?: boolean }) {
  return (
    <StageCard
      title={title}
      description={description}
      aside={
        <dl className="flex flex-col items-end text-[13px]">
          <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Total</dt>
          <dd className="font-semibold tabular-nums">{section.total}</dd>
        </dl>
      }
    >
      {(section.verdict || section.conclusion) && (
        <div className="flex flex-wrap items-start gap-2 px-6 pb-3 text-[12.5px] text-[#475569]">
          {section.verdict && <VerdictPill verdict={section.verdict} />}
          {section.conclusion && <span className="flex-1 whitespace-pre-line">{section.conclusion}</span>}
        </div>
      )}
      <DataTable
        caption={title}
        minWidth={1000}
        headers={["No.", "Jenis Produk", "HS Code", "Jumlah", ...(growth ? ["Perubahan vs Tahun Sebelumnya"] : []), "Status Verifikasi"]}
        empty={section.rows.length === 0 && "Jumlah produksi belum diisi."}
      >
        {section.rows.map((row, index) => (
          <tr key={row.key}>
            <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
            <th scope="row" className={`${TD} max-w-[360px] text-left font-semibold`}>
              {row.product}
              {row.description && <span className="block text-[11.5px] font-normal text-[#64748B]">{row.description}</span>}
            </th>
            <td className={`${TD} font-mono text-[12.5px]`}>{row.hsCode ?? "—"}</td>
            <td className={`${TD} text-right tabular-nums`}>{formatQuantity(row.quantity, row.unit)}</td>
            {growth && <td className={`${TD} text-right tabular-nums`}>{"growth" in row ? row.growth : "—"}</td>}
            <td className={TD}>
              <div className="flex flex-col items-start gap-1">
                <VerdictPill verdict={row.verdict} />
                {row.note && <span className="max-w-[220px] text-[11.5px] text-[#64748B]">{row.note}</span>}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </StageCard>
  );
}

/**
 * Tahap 9 "Kapasitas Produksi" — the licensed capacity, last year's production and next year's plan,
 * with the Verifikator's decision on each production row.
 */
export function KapasitasStage({ data, handedOver }: StageProps) {
  const stage = buildKapasitasStage(data);
  return (
    <>
      <StageCard title="Kapasitas Produksi Berdasarkan Perizinan" description="Kapasitas per KBLI menurut perizinan dan kapasitas yang terpasang, seperti yang diajukan.">
        <DataTable caption="Kapasitas produksi berdasarkan perizinan" minWidth={1000} headers={["Jenis Produk", "KBLI", "Berdasarkan Izin", "Kapasitas Terpasang", "Terpasang / Izin"]} empty={stage.licensed.length === 0 && "Kapasitas produksi belum diisi."}>
          {stage.licensed.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{row.product}</th>
              <td className={`${TD} max-w-[360px] text-[12.5px]`}>{row.kbli ?? "—"}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.licensed}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.installed}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.utilisation}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <div className="px-0"><PendingHandover handedOver={handedOver} /></div>
      <ProductionTable title="Kapasitas Jumlah Produksi Periode Satu Tahun Sebelumnya" description="Realisasi produksi satu tahun sebelumnya per jenis produk, dengan status yang dicatat Verifikator." section={stage.previous} />
      <ProductionTable title="Kapasitas Jumlah Rencana Produksi Periode Tahun Berikutnya" description="Rencana produksi tahun berikutnya per jenis produk, dibandingkan dengan produksi tahun sebelumnya." section={stage.plan} growth />
      <VkiCheckMatrix title="Matriks Pemeriksaan Kapasitas Produksi" checks={stage.checks} />
    </>
  );
}

type MaterialSection = ReturnType<typeof buildBahanBakuStage>["usage" | "plan"];

/** One raw-material topic: per bahan baku × product the quantity and the Verifikator's decision, the total and the conclusion. */
function MaterialTable({ title, description, section, plan }: { title: string; description: string; section: MaterialSection; plan?: boolean }) {
  return (
    <StageCard
      title={title}
      description={description}
      aside={
        <dl className="flex flex-col items-end text-[13px]">
          <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Total</dt>
          <dd className="font-semibold tabular-nums">{section.total}</dd>
        </dl>
      }
    >
      {(section.verdict || section.conclusion) && (
        <div className="flex flex-wrap items-start gap-2 px-6 pb-3 text-[12.5px] text-[#475569]">
          {section.verdict && <VerdictPill verdict={section.verdict} />}
          {section.conclusion && <span className="flex-1 whitespace-pre-line">{section.conclusion}</span>}
        </div>
      )}
      <DataTable
        caption={title}
        minWidth={1100}
        headers={["No.", "Bahan Baku / Penolong", "HS Code", "Untuk Produk", ...(plan ? ["Dalam Negeri", "Luar Negeri", "Negara Asal", "Total"] : ["Jumlah"]), "Status Verifikasi"]}
        empty={section.rows.length === 0 && "Data bahan baku belum diisi."}
      >
        {section.rows.map((row, index) => (
          <tr key={row.key}>
            <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
            <th scope="row" className={`${TD} max-w-[320px] text-left font-semibold`}>
              {row.material}
              {row.description && <span className="block text-[11.5px] font-normal text-[#64748B]">{row.description}</span>}
            </th>
            <td className={`${TD} font-mono text-[12.5px]`}>{row.hsCode ?? "—"}</td>
            <td className={TD}>{row.product ?? "—"}</td>
            {"domestic" in row && (
              <>
                <td className={`${TD} text-right tabular-nums`}>{row.domestic}</td>
                <td className={`${TD} text-right tabular-nums`}>{row.foreign}</td>
                <td className={TD}>{row.origin ?? "—"}</td>
              </>
            )}
            <td className={`${TD} text-right tabular-nums`}>{formatQuantity(row.quantity, row.unit)}</td>
            <td className={TD}>
              <div className="flex flex-col items-start gap-1">
                <VerdictPill verdict={row.verdict} />
                {row.note && <span className="max-w-[220px] text-[11.5px] text-[#64748B]">{row.note}</span>}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </StageCard>
  );
}

/** Tahap 10 "Kebutuhan Bahan Baku" — last year's usage, current stock and the 1-year need, with the Verifikator's decisions. */
export function BahanBakuStage({ data, handedOver }: StageProps) {
  const stage = buildBahanBakuStage(data);
  return (
    <>
      <PendingHandover handedOver={handedOver} />
      <MaterialTable title="Penggunaan Bahan Baku/Penolong Periode Satu Tahun Sebelumnya" description="Volume penggunaan bahan baku dan/atau bahan penolong pada periode satu tahun sebelumnya." section={stage.usage} />
      <MaterialTable title="Jumlah Stok Terkini Bahan Baku/Penolong" description="Stok bahan baku dan/atau bahan penolong yang tersedia saat ini." section={stage.stock} />
      <MaterialTable title="Rencana Kebutuhan Bahan Baku/Penolong 1 Tahun ke Depan" description="Rencana kebutuhan bahan baku dan/atau bahan penolong 1 tahun ke depan, dari dalam dan luar negeri." section={stage.plan} plan />
      <VkiCheckMatrix title="Matriks Pemeriksaan Kebutuhan Bahan Baku" checks={stage.checks} />
    </>
  );
}

/** Tahap 11 "Penjualan Dalam Negeri & Ekspor" — sales per product at home and abroad, with the export share and the Verifikator's conclusion. */
export function PenjualanStage({ data, handedOver }: StageProps) {
  const stage = buildPenjualanStage(data);
  return (
    <>
      <PendingHandover handedOver={handedOver} />
      <StageCard
        title="Penjualan Dalam Negeri & Ekspor"
        description="Jumlah penjualan dalam negeri dan ekspor per jenis produk, beserta negara tujuan."
        aside={
          <dl className="grid grid-cols-2 gap-x-6 text-right text-[13px]">
            <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Dalam Negeri</dt>
            <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Ekspor</dt>
            <dd className="font-semibold tabular-nums">{stage.totalDomestic}</dd>
            <dd className="font-semibold tabular-nums">{stage.totalExport}</dd>
          </dl>
        }
      >
        {(stage.verdict || stage.conclusion) && (
          <div className="flex flex-wrap items-start gap-2 px-6 pb-3 text-[12.5px] text-[#475569]">
            {stage.verdict && <VerdictPill verdict={stage.verdict} />}
            {stage.conclusion && <span className="flex-1 whitespace-pre-line">{stage.conclusion}</span>}
          </div>
        )}
        <DataTable
          caption="Penjualan Dalam Negeri & Ekspor"
          minWidth={1100}
          headers={["No.", "Jenis Produk", "HS Code", "Dalam Negeri", "Ekspor", "Total", "Porsi Ekspor", "Negara Tujuan"]}
          empty={stage.rows.length === 0 && "Data penjualan belum diisi."}
        >
          {stage.rows.map((row, index) => (
            <tr key={row.id}>
              <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
              <th scope="row" className={`${TD} max-w-[320px] text-left font-semibold`}>
                {row.product}
                {row.description && <span className="block text-[11.5px] font-normal text-[#64748B]">{row.description}</span>}
              </th>
              <td className={`${TD} font-mono text-[12.5px]`}>{row.hsCode ?? "—"}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatQuantity(row.domestic, row.unit)}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatQuantity(row.exported, row.unit)}</td>
              <td className={`${TD} text-right font-semibold tabular-nums`}>{formatQuantity(row.total, row.unit)}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.exportShare}</td>
              <td className={`${TD} max-w-[240px]`}>{row.destination ?? "—"}</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <VkiCheckMatrix title="Matriks Pemeriksaan Penjualan" checks={stage.checks} />
    </>
  );
}

/** Tahap 12 "Tenaga Kerja" — the workforce per category and its supporting document. */
export function TenagaKerjaStage({ data, handedOver }: StageProps) {
  const stage = buildTenagaKerjaStage(data);
  return (
    <>
      <StageCard title="Data Tenaga Kerja" description={stage.workforce.length ? `${stage.total} orang tenaga kerja, seperti yang diajukan pemohon.` : "Rincian per kategori tidak diisi; lihat dokumen tenaga kerja."}>
        <DataTable caption="Data tenaga kerja" minWidth={600} headers={["Kategori", "Jumlah"]} empty={stage.workforce.length === 0 && "Rincian tenaga kerja per kategori belum diisi."}>
          {stage.workforce.map((entry) => (
            <tr key={entry.category}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{entry.category}</th>
              <td className={`${TD} tabular-nums`}>{entry.count.toLocaleString("id-ID")} orang</td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <div className="flex flex-col gap-2">
        <PendingHandover handedOver={handedOver} />
        <DocumentMatrix title="Matriks Pemeriksaan Tenaga Kerja" rows={stage.documents} />
      </div>
    </>
  );
}

/** Tahap 13 "Surat Pernyataan" — the applicant's statements (number, date, signer) and their status. */
export function PernyataanStage({ data, handedOver }: StageProps) {
  const stage = buildPernyataanStage(data);
  return (
    <>
      <StageCard title="Daftar Surat Pernyataan" description="Surat pernyataan yang dilampirkan pemohon.">
        <DataTable caption="Daftar surat pernyataan" minWidth={1000} headers={["Surat Pernyataan", "Nomor Surat", "Tanggal", "Penandatangan", "Dokumen"]} empty={stage.statements.length === 0 && "Belum ada surat pernyataan."}>
          {stage.statements.map((statement) => (
            <tr key={statement.key}>
              <th scope="row" className={`${TD} max-w-[360px] text-left font-semibold`}>{statement.label}</th>
              <td className={`${TD} font-mono text-[12.5px]`}>{statement.number ?? "—"}</td>
              <td className={TD}>{formatCalendarDate(statement.date)}</td>
              <td className={TD}>{statement.signer ?? "—"}</td>
              <td className={TD}><DocumentChip document={statement.document} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <div className="flex flex-col gap-2">
        <PendingHandover handedOver={handedOver} />
        <DocumentMatrix title="Matriks Pemeriksaan Surat Pernyataan" rows={stage.documents} />
      </div>
    </>
  );
}

function AnalysisCellView({ cell }: { cell: AnalysisCell }) {
  return typeof cell === "string" ? <>{cell}</> : <VerdictPill verdict={{ label: cell.text, tone: cell.tone }} />;
}

function AnalysisNote({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h5 className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</h5>
      <p className="mt-1 whitespace-pre-line text-[13px] text-[#475569]">{text}</p>
    </div>
  );
}

function AnalysisPartView({ part }: { part: AnalysisPart }) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#EEF2F6] pt-4">
      <h4 className="text-[14.5px] font-semibold">{part.title}</h4>
      {part.stats.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {part.stats.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2">
              <dt className="text-[11.5px] text-[#64748B]">{label}</dt>
              <dd className="mt-0.5 text-[14px] font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {part.formula && <p className="rounded-lg bg-[#F1F5F9] px-3 py-2 text-center text-[12.5px] font-semibold tabular-nums">{part.formula}</p>}
      {part.tables.map((table, tableIndex) => (
        <div key={tableIndex} className="flex flex-col gap-2">
          {table.title && <h5 className="text-[13px] font-semibold text-[#334155]">{table.title}</h5>}
          <DataTable caption={table.title || part.title} minWidth={Math.max(900, table.headers.length * 135)} headers={table.headers} empty={table.rows.length === 0 && table.empty}>
            {table.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column} className={`${TD} whitespace-pre-line ${column === 0 ? "font-semibold" : ""}`}>
                    <AnalysisCellView cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
        </div>
      ))}
    </div>
  );
}

/**
 * Tahap 14 "Analisis Teknis" in three sub-stages — Energi Listrik, Kapasitas Produksi, Kebutuhan Bahan
 * Baku — each in the lettered parts of the Technical Analyst's module. Compliance only shows them.
 */
export function AnalisisStage({ data, handedOver }: StageProps) {
  const modules = buildAnalisisStage(data);
  return (
    <>
      <PendingHandover handedOver={handedOver} who="Technical Analyst" />
      {modules.map((module) => (
        <StageCard key={module.key} title={`${module.number} ${module.label}`} description="Perhitungan dan keputusan Technical Analyst." aside={<VerdictPill verdict={module.verdict} />}>
          <div className="flex flex-col gap-4 px-6 pb-5">
            {module.parts.map((part) => (
              <AnalysisPartView key={part.title} part={part} />
            ))}
            <div className="flex flex-col gap-3 border-t border-[#EEF2F6] pt-4">
              <AnalysisNote label="Kesimpulan Analis" text={module.kesimpulan ?? "—"} />
            </div>
          </div>
        </StageCard>
      ))}
    </>
  );
}
