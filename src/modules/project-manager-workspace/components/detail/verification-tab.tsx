"use client";

import { useState } from "react";
import DOMPurify from "dompurify";

import { MaterialIcon } from "../material-icon";
import "@/components/form/rich-text-editor.css";
import {
  MACHINE_VERIFICATION_STATUS_BADGE,
  MACHINE_VERIFICATION_STATUS_LABELS,
  PRODUCT_VERIFICATION_STATUS_BADGE,
  PRODUCT_VERIFICATION_STATUS_LABELS,
} from "@/modules/verifikator-workspace/status";
import { MACHINE_KONDISI_LABELS, type MachineKondisiValue } from "@/modules/applications/schema";
import type { PmApplicationDetail } from "./types";

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

const SUB_TABS = ["summary", "mesin", "product", "produksi"] as const;
type SubTab = (typeof SUB_TABS)[number];
const SUB_TAB_LABELS: Record<SubTab, string> = { summary: "Ringkasan", mesin: "Verifikasi Mesin", product: "Verifikasi Product", produksi: "Verifikasi Jumlah Produksi" };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-[#eef0f6] text-[#5b6478]",
  APPROVED: "bg-[#e6f6ec] text-[#1a9850]",
  VERIFIED: "bg-[#e6f6ec] text-[#1a9850]",
  SESUAI: "bg-[#e6f6ec] text-[#1a9850]",
  NEED_REVISION: "bg-[#fdf4de] text-[#c98a1f]",
  TIDAK_SESUAI: "bg-[#fdeceb] text-[#e15241]",
  REJECTED: "bg-[#fdeceb] text-[#e15241]",
};

const RAW_MATERIAL_CONVERSION_KATEGORI_LABELS: Record<string, string> = {
  BAHAN_BAKU: "Bahan Baku",
  BAHAN_PENOLONG: "Bahan Penolong",
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[11.5px] font-bold text-[#20180f]">{label}</div>
      <div className="rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f]">{value || "—"}</div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#e8dccd]">
      <table className="w-full min-w-165 border-collapse text-[12px]">
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

function Badge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${STATUS_BADGE[status] ?? "bg-[#f1efe9] text-[#5c4a3d]"}`}>{status}</span>;
}

function MesinSection({ data }: { data: PmApplicationDetail }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-[#8a7565]">Data mesin produksi sesuai lampiran aplikasi.</p>

      {data.machines.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#8a7565]">
          Tidak ada data mesin pada aplikasi ini.
        </p>
      )}

      {data.machines.length > 0 && (
        <div className="overflow-hidden rounded-[9px] border border-[#e8dccd]">
          <div className="grid grid-cols-[0.5fr_1.1fr_1.2fr_0.9fr_0.9fr_0.7fr_0.8fr] bg-[#e0662e]">
            {["No", "Proses", "Jenis Mesin", "Merk", "Model", "Tahun", "Quantity"].map((h) => (
              <div key={h} className="border-r border-white/30 px-3 py-2.5 text-[12px] font-extrabold text-white last:border-r-0">
                {h}
              </div>
            ))}
          </div>
          {data.machines.map((row, index) => {
            const isExpanded = expandedId === row.id;
            return (
              <div key={row.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedId((prev) => (prev === row.id ? null : row.id));
                    }
                  }}
                  className="grid cursor-pointer grid-cols-[0.5fr_1.1fr_1.2fr_0.9fr_0.9fr_0.7fr_0.8fr] border-t border-[#f0ded0]"
                >
                  <div className="flex items-center gap-1.5 border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">
                    <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-[16px] text-[#a68f80]" />
                    {index + 1}
                  </div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] font-semibold text-[#20180f]">{row.proses || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.nama || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.merk || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.model || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.tahun || "—"}</div>
                  <div className="flex items-center justify-between gap-1.5 px-3 py-2.5">
                    <span className="text-[12.5px] text-[#4a4038]">{row.quantity ? `${row.quantity} ${row.quantitySatuan}`.trim() : "—"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${MACHINE_VERIFICATION_STATUS_BADGE[row.status as keyof typeof MACHINE_VERIFICATION_STATUS_BADGE] ?? MACHINE_VERIFICATION_STATUS_BADGE.PENDING}`}>
                      {MACHINE_VERIFICATION_STATUS_LABELS[row.status as keyof typeof MACHINE_VERIFICATION_STATUS_LABELS] ?? row.status}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#f0ded0] bg-[#fbf8f4] p-5">
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <ReadOnlyField label="Nama Proses" value={row.proses} />
                          <ReadOnlyField label="Jenis Mesin" value={row.nama} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <ReadOnlyField label="Merk" value={row.merk} />
                          <ReadOnlyField label="Model" value={row.model} />
                          <ReadOnlyField label="Tahun" value={row.tahun} />
                        </div>
                        <ReadOnlyField label="Quantity" value={row.quantity ? `${row.quantity} ${row.quantitySatuan}`.trim() : ""} />
                      </div>
                      <div>
                        <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Foto Mesin</div>
                        {row.photoMesinPath ? (
                          <a href={fileHref(row.photoMesinPath)} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileHref(row.photoMesinPath)}
                              alt={row.proses}
                              className="aspect-[0.77] w-full rounded-lg border border-[#e8dccd] object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex aspect-[0.77] w-full items-center justify-center rounded-lg border border-dashed border-[#c8dbc9] text-center text-[10px] text-[#5a7a63]">
                            Belum ada foto
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <ReadOnlyField
                        label="Kapasitas Produksi (jumlah × kapasitas/jam)"
                        value={row.kapasitas ? `${row.kapasitas} ${row.kapasitasSatuan}`.trim() : ""}
                      />
                      <ReadOnlyField label="Kapasitas Produksi per Jam" value={row.kapasitasJam ? `${row.kapasitasJam} ${row.kapasitasJamSatuan}`.trim() : ""} />
                      <ReadOnlyField label="Power Consumption" value={row.power ? `${row.power} ${row.powerSatuan}`.trim() : ""} />
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <ReadOnlyField label="Waktu Beroperasi (jam/hari)" value={row.waktuBeroperasi} />
                      <ReadOnlyField
                        label="Kapasitas per Hari (waktu beroperasi × kapasitas produksi)"
                        value={row.kapasitasPerHari ? `${row.kapasitasPerHari} ${row.kapasitasJamSatuan}`.trim() : ""}
                      />
                      <ReadOnlyField label="Kondisi" value={row.kondisi ? (MACHINE_KONDISI_LABELS[row.kondisi as MachineKondisiValue] ?? row.kondisi) : ""} />
                    </div>
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ReadOnlyField label="Input / Raw Material" value={row.input} />
                      <ReadOnlyField label="Output / Produk" value={row.output} />
                    </div>

                    <div className="border-t border-[#e8dccd] pt-3.5">
                      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Uraian Observasi Verifikator</div>
                      {row.note ? (
                        <div
                          className="rte-content min-h-16 rounded-lg border border-[#e8dccd] bg-white p-2.5 text-[12.5px] text-[#20180f]"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(row.note, { ADD_ATTR: ["target"] }) }}
                        />
                      ) : (
                        <div className="min-h-16 rounded-lg border border-[#e8dccd] bg-white p-2.5 text-[12.5px] text-[#a68f80]">
                          Belum ada catatan.
                        </div>
                      )}
                      {row.verifiedAt && (
                        <div className="mt-2 text-[10.5px] text-[#8a7565]">Diverifikasi: {new Date(row.verifiedAt).toLocaleString("id-ID")}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductSection({ data }: { data: PmApplicationDetail }) {
  const [expandedBahan, setExpandedBahan] = useState<Record<string, boolean>>({});

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3 rounded-[10px] border border-[#f0ded0] bg-white p-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="inventory_2" className="text-[18px] text-[#e0662e]" />
          <div>
            <div className="text-[13.5px] font-extrabold text-[#20180f]">Product Verification</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
              Memastikan produk yang diajukan sesuai ruang lingkup program verifikasi dan didukung oleh hasil survey.
            </div>
          </div>
        </div>
      </div>

      {data.products.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#8a7565]">
          Tidak ada data produk pada aplikasi ini.
        </p>
      )}

      <div className="flex flex-col gap-3.5">
        {data.products.map((p) => {
          const bahanBaku = data.rawMaterialConversion.filter((c) => c.productId === p.id);
          const isBahanOpen = expandedBahan[p.id] ?? false;
          return (
            <div key={p.id} className="rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3.5">
                  {p.photoPath ? (
                    <a href={fileHref(p.photoPath)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileHref(p.photoPath)} alt={p.materialType} className="h-18 w-18 rounded-lg border border-[#e8dccd] object-cover" />
                    </a>
                  ) : (
                    <div className="h-18 w-18 shrink-0 rounded-lg bg-[#f1e9df]" />
                  )}
                  <div className="flex gap-3">
                    <div>
                      <div className="text-[14px] font-extrabold text-[#20180f]">{p.materialType || "—"}</div>
                      {p.kategori && (
                        <>
                          <div className="mt-1.5 text-[10px] font-bold text-[#a68f80]">KATEGORI</div>
                          <div className="mt-0.5 text-[13px] font-bold text-[#e0662e]">{p.kategori}</div>
                        </>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#a68f80]">HS CODE</div>
                      <div className="mt-0.75 text-[15px] font-extrabold text-[#20180f]">{p.hsCode || "—"}</div>
                    </div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-0.75 text-[11px] font-bold ${PRODUCT_VERIFICATION_STATUS_BADGE[p.status as keyof typeof PRODUCT_VERIFICATION_STATUS_BADGE] ?? PRODUCT_VERIFICATION_STATUS_BADGE.PENDING}`}>
                  {PRODUCT_VERIFICATION_STATUS_LABELS[p.status as keyof typeof PRODUCT_VERIFICATION_STATUS_LABELS] ?? p.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[10px] font-bold text-[#a68f80]">DESKRIPSI PRODUK</div>
                  <div className="rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">{p.deskripsi || "—"}</div>
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold text-[#a68f80]">DESKRIPSI HS CODE</div>
                  <div className="rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">{p.hsDesc || "—"}</div>
                </div>
              </div>

              {p.verifiedAt && <div className="mt-3 text-[11px] text-[#a68f80]">Diverifikasi: {new Date(p.verifiedAt).toLocaleString("id-ID")}</div>}
              {p.note && (
                <div className="mt-2 rounded-lg border border-dashed border-[#e8b1a3] bg-[#fbf8f4] p-2.5 text-[11.5px] leading-relaxed text-[#4a4038]">
                  {p.note}
                </div>
              )}

              <div className="mt-3.5 border-t border-[#f0ded0] pt-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedBahan((prev) => ({ ...prev, [p.id]: !isBahanOpen }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedBahan((prev) => ({ ...prev, [p.id]: !isBahanOpen }));
                    }
                  }}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <MaterialIcon name={isBahanOpen ? "expand_less" : "chevron_right"} className="text-[16px] text-[#8a7565]" />
                  <span className="text-[12.5px] font-bold text-[#20180f]">Bahan Baku yang Digunakan ({bahanBaku.length})</span>
                </div>
                {isBahanOpen && (
                  <div className="mt-3 flex flex-col gap-3.5">
                    {bahanBaku.length === 0 && <p className="text-[12px] text-[#a68f80]">Belum ada bahan baku yang ditautkan ke produk ini.</p>}
                    {bahanBaku.map((b) => (
                      <div key={b.id} className="rounded-xl border border-[#e0662e] bg-white p-5.5">
                        <div className="mb-4 flex flex-wrap items-start gap-5">
                          {b.photoPath ? (
                            <a href={fileHref(b.photoPath)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fileHref(b.photoPath)}
                                alt={b.jenis || "Bahan baku"}
                                className="aspect-square w-27.5 rounded-lg border border-[#e8dccd] object-cover"
                              />
                            </a>
                          ) : (
                            <div className="flex aspect-square w-27.5 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#c8dbc9] text-center text-[9.5px] text-[#5a7a63]">
                              Belum ada foto
                            </div>
                          )}
                          <div className="flex flex-1 flex-wrap gap-x-8 gap-y-3">
                            <div className="min-w-40">
                              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jenis Bahan Baku</div>
                              <div className="text-[19px] font-extrabold text-[#e0662e]">{b.jenis || "—"}</div>
                            </div>
                            <div className="min-w-35">
                              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
                              <div className="font-mono text-[19px] font-extrabold text-[#20180f]">{b.hsCode || "—"}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Bahan Baku</div>
                            <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                              {b.deskripsi || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi HS Code</div>
                            <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                              {b.hsDesc || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mb-3.5 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
                          <div>
                            <span className="text-[#8a7565]">Rasio Konversi ke Produk</span>
                            <div className="mt-1 flex items-center gap-2 text-[12px] text-[#4a4038]">
                              <span className="rounded bg-[#fbf8f4] px-2 py-1 font-semibold">
                                {b.volumeKebutuhanJumlah || "—"} {b.volumeKebutuhanSatuan}
                              </span>
                              <MaterialIcon name="arrow_forward" className="text-[15px] text-[#8a7565]" />
                              <span className="rounded bg-[#fbf8f4] px-2 py-1 font-semibold">
                                {b.volumeProduksiJumlah || "—"} {b.volumeProduksiSatuan}
                              </span>
                            </div>
                          </div>
                          {b.kategori && (
                            <div>
                              <span className="text-[#8a7565]">Kategori</span>
                              <div className="font-bold text-[#20180f]">{RAW_MATERIAL_CONVERSION_KATEGORI_LABELS[b.kategori] ?? b.kategori}</div>
                            </div>
                          )}
                        </div>
                        {b.keterangan && (
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Keterangan</div>
                            <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                              {b.keterangan}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VerificationTab({ data }: { data: PmApplicationDetail }) {
  const [sub, setSub] = useState<SubTab>("summary");
  const dokumen = data.assignments.dokumen;

  return (
    <div>
      <div className="mb-4 flex w-fit gap-1 rounded-lg bg-[#f7f2ec] p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSub(t)}
            className={`rounded-md px-3.5 py-1.75 text-[12.5px] font-bold ${sub === t ? "bg-white text-[#c14a1f]" : "text-[#8a7565]"}`}
          >
            {SUB_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {!dokumen && <p className="text-[13px] text-[#a68f80]">Belum ada penugasan verifikasi dokumen untuk permohonan ini.</p>}

      {dokumen && sub === "summary" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Mesin", value: data.machines.length },
            { label: "Produk", value: data.products.length },
            { label: "Bahan Baku", value: data.rawMaterialUsage.length },
            { label: "Penjualan", value: data.sales.length },
          ].map((c) => (
            <div key={c.label} className="rounded-[10px] border border-[#f0ded0] bg-white p-4">
              <div className="text-[20px] font-extrabold text-[#20180f]">{c.value}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-[#8a7565]">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {dokumen && sub === "mesin" && <MesinSection data={data} />}

      {dokumen && sub === "product" && <ProductSection data={data} />}

      {dokumen && sub === "produksi" && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Kapasitas Produksi Berdasarkan Perizinan</div>
            <Table headers={["KBLI", "Berdasarkan Izin", "Kapasitas Terpasang", "Satuan"]}>
              {data.capacity.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-[#a68f80]">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {data.capacity.map((c) => (
                <tr key={c.id} className="border-t border-[#efe2d4]">
                  <td className="px-3 py-2 font-semibold text-[#20180f]">
                    {c.kbliCode || "—"}
                    {c.kbliDescription && <div className="mt-0.5 text-[10.5px] font-normal text-[#8a7565]">{c.kbliDescription}</div>}
                  </td>
                  <td className="px-3 py-2 text-[#4a4038]">{c.berdasarkanIzin || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{c.kapasitasTerpasang || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{c.satuan || "—"}</td>
                </tr>
              ))}
            </Table>
          </div>

          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Jumlah Produksi</div>
            <Table headers={["Section", "Jenis Produk", "HS Code", "Jumlah", "Satuan", "Status"]}>
              {data.productionQty.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[#a68f80]">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {data.productionQty.map((r) => (
                <tr key={r.key} className="border-t border-[#efe2d4]">
                  <td className="px-3 py-2 text-[#4a4038]">{r.section === "sebelumnya" ? "Sebelumnya" : "Rencana"}</td>
                  <td className="px-3 py-2 font-semibold text-[#20180f]">{r.jenisProduk || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.hsCode || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.jumlah || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.satuan || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge status={r.status} />
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Bahan Baku / Penolong</div>
            <Table headers={["Jenis", "HS Code", "Untuk Produk", "Penggunaan", "Stok", "Rencana Kebutuhan", "Satuan"]}>
              {data.rawMaterialUsage.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-[#a68f80]">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {data.rawMaterialUsage.map((r) => (
                <tr key={r.id} className="border-t border-[#efe2d4]">
                  <td className="px-3 py-2 font-semibold text-[#20180f]">{r.jenis || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.hsCode || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.productName || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.penggunaan || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.dataStock || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.rencanaKebutuhan || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.satuan || "—"}</td>
                </tr>
              ))}
            </Table>
          </div>

          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Penjualan Dalam Negeri &amp; Ekspor</div>
            <Table headers={["Produk", "Dalam Negeri", "Luar Negeri", "Satuan"]}>
              {data.sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-[#a68f80]">
                    Tidak ada data.
                  </td>
                </tr>
              )}
              {data.sales.map((r) => (
                <tr key={r.id} className="border-t border-[#efe2d4]">
                  <td className="px-3 py-2 font-semibold text-[#20180f]">{r.productName || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.dalamNegeri || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.luarNegeri || "—"}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{r.satuan || "—"}</td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
