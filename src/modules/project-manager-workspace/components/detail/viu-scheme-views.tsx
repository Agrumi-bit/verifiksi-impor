"use client";

import { useState } from "react";
import DOMPurify from "dompurify";

import { MaterialIcon } from "../material-icon";
import {
  PRODUCT_VERIFICATION_STATUS_BADGE,
  PRODUCT_VERIFICATION_STATUS_LABELS,
  type ProductVerificationStatusValue,
} from "@/modules/verifikator-workspace/status";
import type { PmApplicationDetail, PmViuDetail } from "./types";

/**
 * VIU application detail for the Project Manager — one view per scheme (Permenperin 27/2025):
 * - Bahan Baku Industri (Ps 37 ayat (2) huruf a; LHVIU Ps 39 ayat (3)): products per Partner Industri and its LHVKI.
 * - Bahan Baku Non Industri (Ps 37 ayat (2) huruf b; LHVIU Ps 39 ayat (4)): products for non-industri partners.
 * - Barang Konsumsi (Ps 37 ayat (2) huruf c; LHVIU Ps 39 ayat (5)): products per merek with HS, negara asal, stok, nilai.
 * VKI keeps its own production-capability views (info-tabs.tsx / verification-tab.tsx).
 */

export const IMPORT_TYPE_LABELS: Record<string, string> = {
  BAHAN_BAKU_INDUSTRI: "Bahan Baku Industri",
  BAHAN_BAKU_NON_INDUSTRI: "Bahan Baku Non Industri",
  BARANG_KONSUMSI: "Barang Konsumsi",
};
const IMPORT_TYPE_ORDER = ["BAHAN_BAKU_INDUSTRI", "BAHAN_BAKU_NON_INDUSTRI", "BARANG_KONSUMSI"];

export function applicationTypeLabel(data: Pick<PmApplicationDetail, "verificationType" | "importTypes">): string {
  if (data.verificationType !== "VIU") return data.verificationType === "VKI" ? "VKI — Verifikasi Kemampuan Industri" : data.verificationType;
  const types = IMPORT_TYPE_ORDER.filter((t) => data.importTypes?.includes(t)).map((t) => IMPORT_TYPE_LABELS[t]);
  return types.length ? `VIU — ${types.join(" + ")}` : "VIU — Jenis Impor belum ditentukan";
}

function hasType(data: PmApplicationDetail, type: string): boolean {
  return data.importTypes?.includes(type) ?? false;
}

type BahanBakuProduct = PmViuDetail["bahanBakuProducts"][number];

/** Bahan baku products are one list for Industri and Non Industri — a product tied to a Partner Industri is Industri's. */
function splitBahanBaku(data: PmApplicationDetail): { industri: BahanBakuProduct[]; nonIndustri: BahanBakuProduct[] } {
  const products = data.viu?.bahanBakuProducts ?? [];
  const industri = hasType(data, "BAHAN_BAKU_INDUSTRI");
  const nonIndustri = hasType(data, "BAHAN_BAKU_NON_INDUSTRI");
  if (industri && !nonIndustri) return { industri: products, nonIndustri: [] };
  if (nonIndustri && !industri) return { industri: [], nonIndustri: products };
  return { industri: products.filter((p) => p.partnerIndustriId), nonIndustri: products.filter((p) => !p.partnerIndustriId) };
}

function fmtMoney(value: number, currency: string): string {
  return `${currency === "IDR" ? "Rp" : currency} ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

function fmtQty(value: number, unit?: string | null): string {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

function totalsLabel(totals: Record<string, number>): string {
  const entries = Object.entries(totals);
  return entries.length ? entries.map(([currency, value]) => fmtMoney(value, currency)).join(" + ") : "—";
}

function statusCounts(items: { status: string }[]) {
  return {
    verified: items.filter((i) => i.status === "VERIFIED").length,
    pending: items.filter((i) => i.status === "PENDING").length,
    revision: items.filter((i) => i.status === "NEED_REVISION").length,
    rejected: items.filter((i) => i.status === "REJECTED").length,
  };
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[#a68f80]">{label}</div>
      <div className="mt-0.5 text-[12.5px] font-semibold text-[#20180f]">{value || "—"}</div>
    </div>
  );
}

function CardShell({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
      <div className="mb-3 flex items-start gap-2">
        <MaterialIcon name={icon} className="mt-0.5 text-[18px] text-[#e0662e]" />
        <div>
          <div className="text-[14px] font-extrabold text-[#20180f]">{title}</div>
          {subtitle && <div className="mt-0.5 text-[11.5px] text-[#8a7565]">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatusLine({ items }: { items: { status: string }[] }) {
  const c = statusCounts(items);
  return (
    <div className="mt-3 flex flex-wrap gap-3 border-t border-[#f5ebe1] pt-3 text-[11.5px]">
      <span className="font-bold text-[#1a9850]">{c.verified} Verified</span>
      <span className="font-bold text-[#5b6478]">{c.pending} Belum Diperiksa</span>
      {c.revision > 0 && <span className="font-bold text-[#c98a1f]">{c.revision} Need Revision</span>}
      {c.rejected > 0 && <span className="font-bold text-[#e15241]">{c.rejected} Rejected</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = status as ProductVerificationStatusValue;
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${PRODUCT_VERIFICATION_STATUS_BADGE[key] ?? "bg-[#f1efe9] text-[#5c4a3d]"}`}>
      {PRODUCT_VERIFICATION_STATUS_LABELS[key] ?? status}
    </span>
  );
}

function Table({ headers, minWidth = 720, children }: { headers: string[]; minWidth?: number; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#e8dccd]">
      <table className="w-full border-collapse text-[12px]" style={{ minWidth }}>
        <thead>
          <tr style={{ background: "#e0662e" }}>
            {headers.map((h) => (
              <th key={h} className="border border-[#c14a1f] px-3 py-2 text-left text-[11px] font-bold text-white">
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

function Td({ children, right, strong }: { children: React.ReactNode; right?: boolean; strong?: boolean }) {
  return <td className={`border border-[#f0ded0] px-3 py-2 align-top text-[#20180f] ${right ? "text-right" : ""} ${strong ? "font-semibold" : ""}`}>{children}</td>;
}

function NoteRow({ note, colSpan }: { note: string; colSpan: number }) {
  if (!note) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="border border-[#f0ded0] bg-[#fbf6f1] px-3 py-2 text-[11.5px] text-[#4a4038]">
        <span className="font-bold text-[#8a7565]">Catatan verifikator: </span>
        <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note, { ADD_ATTR: ["target"] }) }} />
      </td>
    </tr>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#8a7565]">{text}</p>;
}

function distinct(values: (string | null | undefined)[]): number {
  return new Set(values.filter(Boolean)).size;
}

function modalKerjaLabel(data: PmApplicationDetail, source: "bahanBaku" | "konsumsi"): string {
  const value = data.viu?.modalKerja?.[source] ?? null;
  return value !== null ? fmtMoney(value, "IDR") : "Belum diisi";
}

// ---------------------------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------------------------

export function ViuOverviewCards({ data }: { data: PmApplicationDetail }) {
  const viu = data.viu;
  if (!viu) return null;
  const { industri, nonIndustri } = splitBahanBaku(data);
  const konsumsi = viu.konsumsi;

  return (
    <>
      {hasType(data, "BAHAN_BAKU_INDUSTRI") && (
        <CardShell icon="factory" title="Bahan Baku untuk Perusahaan Industri" subtitle="Kebutuhan mitra industri berdasarkan LHVKI (Ps 39 ayat (3) huruf c–e)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Mitra Industri" value={String(viu.partners.length)} />
            <Field label="LHVKI Tercatat" value={`${viu.partners.filter((p) => p.lhvki).length} dari ${viu.partners.length}`} />
            <Field label="Jenis Bahan Baku" value={String(industri.length)} />
            <Field label="Pos Tarif/HS" value={String(distinct(industri.map((p) => p.hsCode)))} />
          </div>
          {viu.partners.length > 0 && (
            <div className="mt-3 flex flex-col gap-1 text-[12px] text-[#4a4038]">
              {viu.partners.map((p) => (
                <div key={p.partnerId}>
                  <span className="font-semibold text-[#20180f]">{p.companyName}</span> · LHVKI {p.lhvki || "—"}
                </div>
              ))}
            </div>
          )}
          <StatusLine items={industri} />
        </CardShell>
      )}

      {hasType(data, "BAHAN_BAKU_NON_INDUSTRI") && (
        <CardShell icon="storefront" title="Bahan Baku untuk Perusahaan Non Industri" subtitle="Kebutuhan mitra non industri berdasarkan kontrak (Ps 39 ayat (4) huruf c–d)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Jenis Bahan Baku" value={String(nonIndustri.length)} />
            <Field label="Pos Tarif/HS" value={String(distinct(nonIndustri.map((p) => p.hsCode)))} />
            <Field label="Modal Kerja (Surat Pernyataan)" value={modalKerjaLabel(data, "bahanBaku")} />
          </div>
          <StatusLine items={nonIndustri} />
        </CardShell>
      )}

      {hasType(data, "BARANG_KONSUMSI") && (
        <CardShell icon="shopping_bag" title="Barang Konsumsi" subtitle="Merek, pos tarif/HS, negara asal, stok, dan nilai impor (Ps 39 ayat (5) huruf c–f)">
          {konsumsi && konsumsi.products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Merek" value={String(distinct(konsumsi.products.map((p) => p.brandId)))} />
                <Field label="Produk" value={String(konsumsi.products.length)} />
                <Field label="Pos Tarif/HS" value={String(distinct(konsumsi.products.map((p) => p.hsCode)))} />
                <Field label="Negara Asal" value={String(distinct(konsumsi.products.flatMap((p) => p.originCountryNames)))} />
                <Field label="Nilai Rencana Impor" value={totalsLabel(konsumsi.totalsByCurrency)} />
                <Field label="Modal Kerja (Surat Pernyataan)" value={modalKerjaLabel(data, "konsumsi")} />
              </div>
              <StatusLine items={konsumsi.products} />
            </>
          ) : (
            <p className="text-[12.5px] text-[#8a7565]">Belum ada produk Barang Konsumsi pada permohonan ini.</p>
          )}
        </CardShell>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------------------------

type ViuSubTab = "summary" | "industri" | "nonIndustri" | "konsumsi" | "finansial";
const VIU_SUB_TAB_LABELS: Record<ViuSubTab, string> = {
  summary: "Ringkasan",
  industri: "Bahan Baku & Mitra Industri",
  nonIndustri: "Bahan Baku Non Industri",
  konsumsi: "Produk Barang Konsumsi",
  finansial: "Nilai Impor & Modal Kerja",
};

function BahanBakuRows({ products, showPartner, partners }: { products: BahanBakuProduct[]; showPartner: boolean; partners: PmViuDetail["partners"] }) {
  const partnerById = new Map(partners.map((p) => [p.partnerId, p]));
  const colSpan = showPartner ? 8 : 6;
  return (
    <>
      {products.map((p) => {
        const partner = p.partnerIndustriId ? partnerById.get(p.partnerIndustriId) : undefined;
        return (
          <FragmentRows key={p.id}>
            <tr>
              {showPartner && <Td strong>{partner?.companyName ?? "—"}</Td>}
              {showPartner && <Td>{partner?.lhvki || "—"}</Td>}
              <Td strong>{p.materialType || "—"}</Td>
              <Td>{p.hsCode || "—"}</Td>
              <Td>{p.hsDesc || "—"}</Td>
              <Td right>{p.estimatedVolume ? `${p.estimatedVolume} ${p.volumeUnit}`.trim() : "—"}</Td>
              <Td>{p.intendedUse || "—"}</Td>
              <Td>
                <StatusBadge status={p.status} />
              </Td>
            </tr>
            <NoteRow note={p.note} colSpan={colSpan} />
          </FragmentRows>
        );
      })}
    </>
  );
}

function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function KonsumsiSection({ data }: { data: PmApplicationDetail }) {
  const konsumsi = data.viu?.konsumsi;
  if (!konsumsi || konsumsi.products.length === 0) return <Empty text="Tidak ada produk Barang Konsumsi pada permohonan ini." />;
  const brands = [...new Set(konsumsi.products.map((p) => p.brandId))];
  return (
    <div className="flex flex-col gap-4">
      {brands.map((brandId) => {
        const rows = konsumsi.products.filter((p) => p.brandId === brandId);
        return (
          <div key={brandId}>
            <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[#20180f]">
              <MaterialIcon name="sell" className="text-[16px] text-[#e0662e]" />
              Merek {rows[0]?.brandName ?? "—"}
              <span className="text-[11.5px] font-semibold text-[#8a7565]">· {rows.length} produk</span>
            </div>
            <Table headers={["Produk", "Sub Kelompok Komoditas", "HS Code", "Negara Asal", "Jumlah Permohonan", "Stok Terkini", "Harga Satuan", "Total", "Status"]} minWidth={980}>
              {rows.map((p) => (
                <FragmentRows key={p.id}>
                  <tr>
                    <Td strong>{p.productName}</Td>
                    <Td>{p.subKelompokKomoditas ?? "—"}</Td>
                    <Td>
                      <div className="font-semibold">{p.hsCode}</div>
                      {p.hsDescription && <div className="mt-0.5 text-[11px] text-[#8a7565]">{p.hsDescription}</div>}
                    </Td>
                    <Td>{p.originCountryNames.join(", ") || "—"}</Td>
                    <Td right>{fmtQty(p.quantity, p.unit)}</Td>
                    <Td right>{fmtQty(p.stockQuantity, p.unit)}</Td>
                    <Td right>{fmtMoney(p.averageUnitPrice, p.currency)}</Td>
                    <Td right strong>{fmtMoney(p.total, p.currency)}</Td>
                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                  </tr>
                  <NoteRow note={p.note} colSpan={9} />
                </FragmentRows>
              ))}
            </Table>
          </div>
        );
      })}
    </div>
  );
}

function FinansialSection({ data }: { data: PmApplicationDetail }) {
  const konsumsi = data.viu?.konsumsi ?? null;
  const showBahanBaku = hasType(data, "BAHAN_BAKU_INDUSTRI") || hasType(data, "BAHAN_BAKU_NON_INDUSTRI");
  return (
    <div className="flex flex-col gap-4">
      {hasType(data, "BARANG_KONSUMSI") && (
        <CardShell icon="payments" title="Barang Konsumsi" subtitle="Nilai rencana impor dari Informasi Produk dan modal kerja dari Surat Pernyataan Kepemilikan Modal Kerja (Ps 37 ayat (2) huruf c angka 2 huruf i)">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(konsumsi?.totalsByCurrency ?? {}).map(([currency, value]) => (
              <Field key={currency} label={`Nilai Rencana Impor (${currency})`} value={fmtMoney(value, currency)} />
            ))}
            <Field label="Modal Kerja (Surat Pernyataan)" value={modalKerjaLabel(data, "konsumsi")} />
          </div>
          {Object.keys(konsumsi?.totalsByCurrency ?? {}).some((c) => c !== "IDR") && (
            <p className="mt-3 text-[11.5px] text-[#8a7565]">
              Nilai dalam mata uang asing dikonversi ke Rupiah oleh Technical Analyst pada Analisis Teknis (lihat tab Analisis).
            </p>
          )}
        </CardShell>
      )}
      {showBahanBaku && (
        <CardShell icon="account_balance" title="Bahan Baku Industri / Non Industri" subtitle="Modal kerja dari Surat Pernyataan Kepemilikan Modal Kerja">
          <Field label="Modal Kerja (Surat Pernyataan)" value={modalKerjaLabel(data, "bahanBaku")} />
        </CardShell>
      )}
    </div>
  );
}

export function ViuVerificationTab({ data }: { data: PmApplicationDetail }) {
  const tabs: ViuSubTab[] = [
    "summary",
    ...(hasType(data, "BAHAN_BAKU_INDUSTRI") ? (["industri"] as const) : []),
    ...(hasType(data, "BAHAN_BAKU_NON_INDUSTRI") ? (["nonIndustri"] as const) : []),
    ...(hasType(data, "BARANG_KONSUMSI") ? (["konsumsi"] as const) : []),
    "finansial",
  ];
  const [selected, setSelected] = useState<ViuSubTab>("summary");
  const sub = tabs.includes(selected) ? selected : "summary";
  const dokumen = data.assignments.dokumen;
  const viu = data.viu;
  const { industri, nonIndustri } = splitBahanBaku(data);

  return (
    <div>
      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-lg bg-[#f7f2ec] p-1">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelected(t)}
            className={`rounded-md px-3.5 py-1.75 text-[12.5px] font-bold ${sub === t ? "bg-white text-[#c14a1f]" : "text-[#8a7565]"}`}
          >
            {VIU_SUB_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {!dokumen && <p className="mb-3 text-[13px] text-[#a68f80]">Belum ada penugasan verifikasi dokumen — status produk masih Belum Diperiksa.</p>}

      {!viu && <Empty text="Data skema VIU tidak tersedia." />}

      {viu && sub === "summary" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ViuOverviewCards data={data} />
        </div>
      )}

      {viu && sub === "industri" &&
        (industri.length === 0 ? (
          <Empty text="Tidak ada bahan baku untuk mitra industri pada permohonan ini." />
        ) : (
          <Table headers={["Mitra Industri", "No. LHVKI", "Jenis Bahan Baku", "HS Code", "Uraian HS", "Volume / Tahun", "Penggunaan", "Status"]} minWidth={980}>
            <BahanBakuRows products={industri} showPartner partners={viu.partners} />
          </Table>
        ))}

      {viu && sub === "nonIndustri" &&
        (nonIndustri.length === 0 ? (
          <Empty text="Tidak ada bahan baku untuk mitra non industri pada permohonan ini." />
        ) : (
          <Table headers={["Jenis Bahan Baku", "HS Code", "Uraian HS", "Volume / Tahun", "Penggunaan", "Status"]}>
            <BahanBakuRows products={nonIndustri} showPartner={false} partners={viu.partners} />
          </Table>
        ))}

      {viu && sub === "konsumsi" && <KonsumsiSection data={data} />}

      {viu && sub === "finansial" && <FinansialSection data={data} />}
    </div>
  );
}
