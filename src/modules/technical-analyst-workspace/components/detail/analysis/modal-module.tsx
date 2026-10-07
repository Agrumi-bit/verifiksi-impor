"use client";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { Card, ConclusionCard, ModuleIntro, ResultBanner, StatBoxes } from "./shared";

const INPUT_CLASS =
  "w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60";

function fmtMoney(value: number, currency: string): string {
  return `${currency === "IDR" ? "Rp" : currency} ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

export function ModalModule({
  data,
  inputs,
  onInputChange,
  kesimpulan,
  onKesimpulanChange,
  status,
  onMarkSesuai,
  onMarkTidakSesuai,
  onSubmit,
  canEdit,
  submitting,
}: ModuleProps) {
  // VIU Barang Konsumsi: the import plan comes from the application's own Product Information (quantity x
  // harga satuan per product), and the working capital from its Surat Pernyataan Kepemilikan Modal Kerja
  // (Ps 37 ayat (2) huruf c angka 2 huruf i)) — neither is re-typed by the analyst.
  const plan = data.konsumsiImportPlan ?? null;
  const isKonsumsi = data.importTypes?.includes("BARANG_KONSUMSI") ?? false;
  const planCurrencies = plan ? Object.keys(plan.totalsByCurrency).sort((a, b) => (a === "IDR" ? -1 : b === "IDR" ? 1 : a.localeCompare(b))) : [];
  const usesPlan = plan !== null && plan.products.length > 0;
  const foreignCurrencies = planCurrencies.filter((c) => c !== "IDR");

  // Rupiah value of the plan: IDR lines as-is, every other currency through the analyst's kurs.
  let planRupiah: number | null = null;
  if (usesPlan) {
    let sum = 0;
    let missingRate = false;
    for (const currency of planCurrencies) {
      const total = plan.totalsByCurrency[currency] ?? 0;
      if (currency === "IDR") {
        sum += total;
      } else {
        const rate = parseNumeric(inputs[`kurs_${currency}`]);
        if (rate === null) missingRate = true;
        else sum += total * rate;
      }
    }
    planRupiah = missingRate ? null : sum;
  }

  const nilaiImpor = usesPlan ? planRupiah : parseNumeric(inputs.nilaiImpor);
  // Jumlah Modal Kerja from the application's own Surat Pernyataan (Industri/Non Industri and Konsumsi each file
  // one). A mixed application shows both; the ratio uses the Konsumsi one when the plan above is Konsumsi's.
  const fromApp = data.modalKerjaFromApplication ?? null;
  const modalSources = [
    { label: "Bahan Baku Industri/Non Industri", amount: fromApp?.bahanBaku ?? null },
    { label: "Barang Konsumsi", amount: fromApp?.konsumsi ?? null },
  ].filter((s): s is { label: string; amount: number } => s.amount !== null);
  const systemModalKerja = usesPlan ? (fromApp?.konsumsi ?? modalSources[0]?.amount ?? null) : (modalSources[0]?.amount ?? null);
  const modalFromSystem = systemModalKerja !== null;
  const modalKerja = modalFromSystem ? systemModalKerja : parseNumeric(inputs.modalKerja);
  const ratio = nilaiImpor && modalKerja !== null ? modalKerja / nilaiImpor : null;
  const sesuai = ratio !== null ? ratio >= 1 : null;

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <ModuleIntro
          icon="payments"
          iconColor="#2f6fe0"
          title="Analisis Pengajuan Impor vs Kepemilikan Modal Perusahaan Importir Umum (API-U)"
          subtitle={
            isKonsumsi
              ? "Menilai kewajaran nilai rencana impor (dari Informasi Produk pada permohonan) dibandingkan modal kerja yang dinyatakan dalam Surat Pernyataan Kepemilikan Modal Kerja (Pasal 37 ayat (2) huruf c angka 2 huruf i) Permenperin 27/2025)."
              : "Menilai kewajaran nilai rencana impor dibandingkan kemampuan permodalan/keuangan API-U."
          }
        />

        {usesPlan && (
          <div className="mb-4">
            <div className="mb-1.5 text-xs font-semibold text-[#594138]">Rencana Impor menurut Permohonan (Informasi Produk)</div>
            <div className="overflow-x-auto rounded-lg border border-[#f0ded0]">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead className="bg-[#fbf6f1] text-left text-[#6b5b4c]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Produk</th>
                    <th className="px-3 py-2 font-semibold">HS Code</th>
                    <th className="px-3 py-2 text-right font-semibold">Jumlah</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga Satuan</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.products.map((product) => (
                    <tr key={product.id} className="border-t border-[#f0ded0] text-[#20180f]">
                      <td className="px-3 py-2">
                        {product.productName}
                        {product.brandName && <span className="text-[#8a7565]"> · {product.brandName}</span>}
                      </td>
                      <td className="px-3 py-2">{product.hsCode}</td>
                      <td className="px-3 py-2 text-right">
                        {product.quantity.toLocaleString("id-ID")} {product.unit ?? ""}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtMoney(product.averageUnitPrice, product.currency)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtMoney(product.total, product.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2.5">
              <StatBoxes items={planCurrencies.map((currency) => ({ label: `Total Rencana Impor (${currency})`, value: fmtMoney(plan.totalsByCurrency[currency] ?? 0, currency) }))} />
            </div>
            {foreignCurrencies.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {foreignCurrencies.map((currency) => (
                  <div key={currency}>
                    <div className="mb-1 text-xs font-semibold text-[#594138]">Kurs 1 {currency} ke Rupiah</div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputs[`kurs_${currency}`] ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => onInputChange(`kurs_${currency}`, e.target.value)}
                      placeholder="Contoh: 16.250"
                      className={INPUT_CLASS}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">
              Nilai Rencana Impor (Rp){usesPlan ? " — otomatis dari permohonan" : ""}
            </div>
            {usesPlan ? (
              <div className={`${INPUT_CLASS} font-semibold`}>
                {planRupiah !== null ? fmtMoney(planRupiah, "IDR") : "Isi kurs untuk menghitung nilai dalam Rupiah"}
              </div>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                value={inputs.nilaiImpor ?? ""}
                disabled={!canEdit}
                onChange={(e) => onInputChange("nilaiImpor", e.target.value)}
                placeholder="0"
                className={INPUT_CLASS}
              />
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">
              {modalFromSystem ? "Modal Kerja menurut Surat Pernyataan (Rp) — otomatis dari permohonan" : "Kepemilikan Modal API-U (Rp)"}
            </div>
            {modalFromSystem ? (
              <div className={`${INPUT_CLASS} font-semibold`}>{fmtMoney(systemModalKerja, "IDR")}</div>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                value={inputs.modalKerja ?? ""}
                disabled={!canEdit}
                onChange={(e) => onInputChange("modalKerja", e.target.value)}
                placeholder="0"
                className={INPUT_CLASS}
              />
            )}
            {modalSources.length > 1 && (
              <div className="mt-1.5 text-[11.5px] text-[#8a7565]">
                {modalSources.map((s) => `${s.label}: ${fmtMoney(s.amount, "IDR")}`).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <StatBoxes items={[{ label: "Rasio Kepemilikan Modal / Nilai Rencana Impor", value: ratio !== null ? `${fmtNum(ratio, 2)}x` : "—" }]} />
        <ResultBanner
          bg={sesuai === null ? "#f2ece5" : sesuai ? "#e2f7ea" : "#fbe4de"}
          color={sesuai === null ? "#6b5b4c" : sesuai ? "#1a9850" : "#c1361f"}
          icon={sesuai === null ? "info" : sesuai ? "check_circle" : "warning"}
          text={
            sesuai === null
              ? usesPlan
                ? "Lengkapi kurs mata uang asing (bila ada) dan modal kerja untuk menghitung rasio."
                : "Isi nilai rencana impor dan kepemilikan modal API-U untuk menghitung rasio."
              : sesuai
                ? "Kepemilikan modal API-U wajar terhadap nilai rencana impor yang diajukan."
                : "Kepemilikan modal API-U tidak mencukupi terhadap nilai rencana impor yang diajukan."
          }
        />
      </Card>

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
