import { buildRencanaImporStage, buildStokStage, type KonsumsiStageInput } from "../../konsumsi-stages";
import { DataTable, PendingHandover, RequirementTag, StageCard, TD, VerdictPill, formatMoney, formatNumber } from "./stage-ui";

type Check = ReturnType<typeof buildRencanaImporStage>["checks"][number];

function CheckMatrix({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <StageCard title={title} description="Status yang dicatat Verifikator per produk. Compliance hanya menampilkan.">
      <DataTable caption={title} minWidth={1050} headers={["Parameter Pemeriksaan", "Objek", "Hasil / Keterangan", "Status Compliance", "Tipe", "Note Regulasi"]}>
        {checks.map((check) => (
          <tr key={check.parameter}>
            <th scope="row" className={`${TD} max-w-[300px] text-left font-semibold`}>{check.parameter}</th>
            <td className={TD}>{check.object}</td>
            <td className={`${TD} max-w-[320px] whitespace-pre-line`}>{check.result}</td>
            <td className={TD}><VerdictPill verdict={check.verdict} /></td>
            <td className={TD}><RequirementTag value={check.type} /></td>
            <td className={`${TD} text-[12.5px] text-[#475569]`}>{check.regulation}</td>
          </tr>
        ))}
      </DataTable>
    </StageCard>
  );
}

/** Tahap 5 "Rencana Impor" — the products requested, with the Verifikator's per-product status. */
export function RencanaImporStage({ data, handedOver }: { data: KonsumsiStageInput; handedOver: boolean }) {
  const { rows, totals, hsCount, checks } = buildRencanaImporStage(data);
  return (
    <>
      <StageCard
        title="Daftar Rencana Impor"
        description={`${rows.length} produk · ${hsCount} HS Code. Nilai impor adalah data pendukung, bukan syarat.`}
        aside={
          totals.length > 0 && (
            <dl className="flex flex-wrap gap-4 text-[13px]">
              {totals.map((item) => (
                <div key={item.currency} className="flex flex-col items-end">
                  <dt className="text-[11px] uppercase tracking-wide text-[#64748B]">Total Nilai</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(item.total, item.currency)}</dd>
                </div>
              ))}
            </dl>
          )
        }
      >
        <div className="px-6 pb-4"><PendingHandover handedOver={handedOver} /></div>
        <DataTable
          caption="Daftar rencana impor"
          minWidth={1300}
          headers={["No.", "Merek", "Kelompok Komoditas", "Sub Kelompok", "HS Code", "Uraian HS", "Jumlah", "Satuan", "Harga Satuan", "Total Nilai", "Status Compliance"]}
          empty={rows.length === 0 && "Permohonan ini belum memuat produk."}
        >
          {rows.map(({ product, total, verdict }, index) => (
            <tr key={product.id}>
              <td className={`${TD} text-[#64748B] tabular-nums`}>{index + 1}</td>
              <th scope="row" className={`${TD} text-left font-semibold`}>
                {product.brandName}
                <span className="block text-[11.5px] font-normal text-[#64748B]">{product.productName}</span>
              </th>
              <td className={TD}>{product.kelompok ?? "—"}</td>
              <td className={TD}>{product.subKelompok ?? "—"}</td>
              <td className={`${TD} font-mono text-[12.5px]`}>{product.hsCode}</td>
              <td className={`${TD} max-w-[220px]`}>{product.hsDescription ?? "—"}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatNumber(product.quantity)}</td>
              <td className={TD}>{product.unit ?? "—"}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatMoney(product.unitPrice, product.currency)}</td>
              <td className={`${TD} text-right font-medium tabular-nums`}>{formatMoney(total, product.currency)}</td>
              <td className={TD}>
                <div className="flex flex-col items-start gap-1">
                  <VerdictPill verdict={verdict} />
                  {verdict.note && <span className="max-w-[180px] text-[11.5px] text-[#B45309]">{verdict.note}</span>}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <CheckMatrix title="Matriks Pemeriksaan Rencana Impor" checks={checks} />
    </>
  );
}

/** Tahap 6 "Stok Terkini" — on-hand stock per product as declared, with the Verifikator's per-product status. */
export function StokStage({ data, handedOver }: { data: KonsumsiStageInput; handedOver: boolean }) {
  const { rows, warehouses, stocked, check } = buildStokStage(data);
  return (
    <>
      <StageCard title="Daftar Stok Terkini" description={`${stocked} dari ${rows.length} produk memiliki stok saat permohonan diajukan.`}>
        <div className="flex flex-col gap-2 px-6 pb-4">
          <PendingHandover handedOver={handedOver} />
          <p className="text-[12.5px] text-[#64748B]">
            Lokasi gudang (dari Tahap 3): {warehouses.length === 0 ? "tidak ada gudang terdaftar" : warehouses.join(" · ")}. Stok tidak dicatat per gudang.
          </p>
        </div>
        <DataTable
          caption="Daftar stok terkini"
          minWidth={1100}
          headers={["Merek", "Kelompok", "Sub Kelompok", "HS Code", "Uraian", "Jumlah Stok", "Satuan", "Status"]}
          empty={rows.length === 0 && "Permohonan ini belum memuat produk."}
        >
          {rows.map(({ product, verdict }) => (
            <tr key={product.id}>
              <th scope="row" className={`${TD} text-left font-semibold`}>
                {product.brandName}
                <span className="block text-[11.5px] font-normal text-[#64748B]">{product.productName}</span>
              </th>
              <td className={TD}>{product.kelompok ?? "—"}</td>
              <td className={TD}>{product.subKelompok ?? "—"}</td>
              <td className={`${TD} font-mono text-[12.5px]`}>{product.hsCode}</td>
              <td className={`${TD} max-w-[220px]`}>{product.hsDescription ?? "—"}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatNumber(product.stock)}</td>
              <td className={TD}>{product.unit ?? "—"}</td>
              <td className={TD}><VerdictPill verdict={verdict} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <CheckMatrix title="Matriks Pemeriksaan Stok" checks={[check]} />
    </>
  );
}
