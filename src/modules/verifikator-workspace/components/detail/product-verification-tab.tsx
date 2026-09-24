"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import {
  PRODUCT_VERIFICATION_STATUSES,
  PRODUCT_VERIFICATION_STATUS_BADGE,
  PRODUCT_VERIFICATION_STATUS_LABELS,
  type ProductVerificationStatusValue,
} from "../../status";
import type { AssignmentStatusValue } from "../../status";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

type ProductRow = {
  id: string;
  kategori: string;
  materialType: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  estimatedVolume: string;
  volumeUnit: string;
  intendedUse: string;
  photoPath: string | null;
  status: ProductVerificationStatusValue;
  note: string;
  verifiedAt: string | null;
};

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

const RAW_MATERIAL_CONVERSION_KATEGORI_LABELS: Record<string, string> = {
  BAHAN_BAKU: "Bahan Baku",
  BAHAN_PENOLONG: "Bahan Penolong",
};

type Props = { assignmentId: string; assignmentStatus: AssignmentStatusValue; payload: ApplicationWizardValues };

export function ProductVerificationTab({ assignmentId, assignmentStatus, payload }: Props) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canEdit = assignmentStatus === "SUBMITTED";

  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "products"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`);
      if (!response.ok) throw new Error("Gagal memuat daftar produk");
      const json = (await response.json()) as { data: ProductRow[] };
      return json.data;
    },
  });

  const rows = data ?? [];
  const rawMaterials = payload.rawMaterials ?? [];
  const rawMaterialConversions = payload.rawMaterialConversions ?? [];

  async function handleDecision(row: ProductRow, status: ProductVerificationStatusValue) {
    setSavingId(row.id);
    const note = draftNotes[row.id] ?? row.note;
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status, note }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status produk");
      return;
    }
    toast.success(`${row.materialType} ditandai ${PRODUCT_VERIFICATION_STATUS_LABELS[status]}.`);
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  if (isLoading) {
    return <p className="text-[13px] text-[#8a7565]">Memuat daftar produk...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
        <div className="mb-1 flex items-center gap-2.5">
          <MaterialIcon name="inventory_2" className="text-[19px] text-[#e0662e]" />
          <h3 className="text-[14.5px] font-extrabold text-[#20180f]">Product Verification</h3>
        </div>
        <p className="text-[13px] text-[#8a7565]">
          Memastikan produk yang diajukan sesuai ruang lingkup program verifikasi dan didukung oleh hasil survey.
          {!canEdit && " Assignment ini tidak lagi berstatus Submitted — keputusan produk bersifat baca saja."}
        </p>
      </div>

      {rows.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#8a7565]">
          Tidak ada produk yang diajukan pada aplikasi ini.
        </p>
      )}

      {rows.map((row) => {
        const materials = rawMaterialConversions
          .filter((c) => c.productId === row.id)
          .map((c) => {
            const rm = rawMaterials.find((r) => r.id === c.rawMaterialId);
            return {
              id: c.id,
              jenis: rm?.jenis ?? "",
              hsCode: rm?.hsCode ?? "",
              hsDesc: rm?.hsDesc ?? "",
              deskripsi: rm?.deskripsi ?? "",
              photoPath: rm?.photoPath ?? "",
              kategori: c.kategori ?? "",
              volumeProduksiJumlah: c.volumeProduksiJumlah ?? "",
              volumeProduksiSatuan: c.volumeProduksiSatuan ?? "",
              volumeKebutuhanJumlah: c.volumeKebutuhanJumlah ?? "",
              volumeKebutuhanSatuan: c.volumeKebutuhanSatuan ?? "",
              rasioKonversi: c.rasioKonversi ?? "",
              keterangan: c.keterangan ?? "",
            };
          });
        const isExpanded = expandedId === row.id;
        return (
          <div key={row.id} className="rounded-xl border border-[#e0662e] bg-white p-5.5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-1 flex-wrap gap-5">
                {row.photoPath ? (
                  <a href={fileHref(row.photoPath)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileHref(row.photoPath)}
                      alt={row.materialType}
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
                    {row.kategori && <div className="text-[15px] font-extrabold text-[#20180f]">{row.kategori}</div>}
                    <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jenis Produk</div>
                    <div className="text-[19px] font-extrabold text-[#e0662e]">{row.materialType || "—"}</div>
                  </div>
                  <div className="min-w-35">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
                    <div className="font-mono text-[19px] font-extrabold text-[#20180f]">{row.hsCode || "—"}</div>
                  </div>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${PRODUCT_VERIFICATION_STATUS_BADGE[row.status]}`}>
                {PRODUCT_VERIFICATION_STATUS_LABELS[row.status]}
              </span>
            </div>

            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Produk</div>
                <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                  {row.deskripsi || "—"}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi HS Code</div>
                <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                  {row.hsDesc || "—"}
                </div>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <div>
                <span className="text-[#8a7565]">Estimasi Volume</span>
                <div className="font-bold text-[#20180f]">
                  {row.estimatedVolume} {row.volumeUnit}
                </div>
              </div>
              <div>
                <span className="text-[#8a7565]">Tujuan Penggunaan</span>
                <div className="font-bold text-[#20180f]">{row.intendedUse}</div>
              </div>
            </div>

            <textarea
              className="mb-2 w-full rounded-lg border border-[#f0ded0] p-2.5 text-[12.5px] text-[#4a4038] outline-none disabled:bg-[#f7f2ec]"
              rows={2}
              placeholder="Catatan ketidaksesuaian (opsional)..."
              defaultValue={row.note}
              disabled={!canEdit}
              onChange={(e) => setDraftNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
            />

            {canEdit && (
              <div className="mb-3 flex flex-wrap gap-2">
                {PRODUCT_VERIFICATION_STATUSES.filter((s) => s !== "PENDING").map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => handleDecision(row, status)}
                    className={
                      "rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50 " +
                      (row.status === status
                        ? "border-[#e0662e] bg-[#fdeadd] text-[#c14a1f]"
                        : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
                    }
                  >
                    {PRODUCT_VERIFICATION_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            )}

            {row.verifiedAt && (
              <div className="mb-3 text-[10.5px] text-[#8a7565]">
                Diverifikasi: {new Date(row.verifiedAt).toLocaleString("id-ID")}
              </div>
            )}

            {materials.length > 0 && (
              <div className="border-t border-[#f0ded0] pt-3">
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-[#8a7565]"
                >
                  <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-[16px]" />
                  Bahan Baku yang Digunakan ({materials.length})
                </button>
                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-3.5">
                    {materials.map((m) => (
                      <div key={m.id} className="rounded-xl border border-[#e0662e] bg-white p-4">
                        <div className="mb-3 flex flex-wrap gap-5">
                          {m.photoPath ? (
                            <a href={fileHref(m.photoPath)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fileHref(m.photoPath)}
                                alt={m.jenis || "Bahan baku"}
                                className="aspect-square w-22.5 rounded-lg border border-[#e8dccd] object-cover"
                              />
                            </a>
                          ) : (
                            <div className="flex aspect-square w-22.5 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#c8dbc9] text-center text-[9px] text-[#5a7a63]">
                              Belum ada foto
                            </div>
                          )}
                          <div className="flex flex-1 flex-wrap gap-x-8 gap-y-3">
                            <div className="min-w-35">
                              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jenis Bahan Baku</div>
                              <div className="text-[16px] font-extrabold text-[#e0662e]">{m.jenis || "—"}</div>
                            </div>
                            <div className="min-w-30">
                              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
                              <div className="font-mono text-[16px] font-extrabold text-[#20180f]">{m.hsCode || "—"}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Bahan Baku</div>
                            <div className="min-h-12 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2 text-[11.5px] leading-relaxed text-[#4a4038]">
                              {m.deskripsi || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi HS Code</div>
                            <div className="min-h-12 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2 text-[11.5px] leading-relaxed text-[#4a4038]">
                              {m.hsDesc || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mb-3 flex flex-wrap items-center gap-x-8 gap-y-3">
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Rasio Konversi ke Produk</div>
                            <div className="flex items-center gap-2 text-[12px] text-[#4a4038]">
                              <span className="rounded bg-[#fbf8f4] px-2 py-1 font-semibold">
                                {m.volumeKebutuhanJumlah || "—"} {m.volumeKebutuhanSatuan}
                              </span>
                              <MaterialIcon name="arrow_forward" className="text-[15px] text-[#8a7565]" />
                              <span className="rounded bg-[#fbf8f4] px-2 py-1 font-semibold">
                                {m.volumeProduksiJumlah || "—"} {m.volumeProduksiSatuan}
                              </span>
                            </div>
                          </div>
                          {m.kategori && (
                            <div>
                              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Kategori</div>
                              <div className="text-[12px] font-semibold text-[#4a4038]">
                                {RAW_MATERIAL_CONVERSION_KATEGORI_LABELS[m.kategori] ?? m.kategori}
                              </div>
                            </div>
                          )}
                        </div>
                        {m.keterangan && (
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Keterangan</div>
                            <div className="min-h-8 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2 text-[11.5px] leading-relaxed text-[#4a4038]">
                              {m.keterangan}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
