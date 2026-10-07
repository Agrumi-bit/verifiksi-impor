"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import {
  PRODUCT_VERIFICATION_STATUSES,
  PRODUCT_VERIFICATION_STATUS_BADGE,
  PRODUCT_VERIFICATION_STATUS_LABELS,
  type AssignmentStatusValue,
  type ProductVerificationStatusValue,
} from "../../status";
import { useHsCodeOptions } from "@/modules/applications/hooks/use-hs-code-options";

type KonsumsiProductRow = {
  id: string;
  source: "generic" | "konsumsi";
  productName: string;
  brandName: string;
  hsCode: string;
  hsDesc: string;
  kelompokKomoditas: string;
  subKelompokKomoditas: string;
  komoditas: string;
  originCountryNames: string[];
  estimatedVolume: string;
  volumeUnit: string;
  averageUnitPrice: string;
  currency: string;
  status: ProductVerificationStatusValue;
  note: string;
  verifiedAt: string | null;
};

type Props = {
  assignmentId: string;
  assignmentStatus: AssignmentStatusValue;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">{label}</div>
      <div className="rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
        {value || "—"}
      </div>
    </div>
  );
}

/**
 * Product Verification for VIU Barang Konsumsi. Konsumsi products come from HS Code master data
 * (brand, HS Code, Kelompok > Sub Kelompok > Komoditas, country of origin, quantity, price), so
 * this tab is deliberately separate from the generic VKI / Bahan Baku tab: the verifikator only
 * records a decision per product — product data is never edited here and there is no
 * "Bahan Baku yang Digunakan".
 */
export function KonsumsiProductVerificationTab({ assignmentId, assignmentStatus }: Props) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const canEdit = assignmentStatus === "SUBMITTED";
  const hsCodeOptions = useHsCodeOptions();
  // hsDescription is a snapshot taken when the applicant saved; fall back to the live master data.
  const descForHsCode = (hsCode: string) => hsCodeOptions.find((option) => option.value === hsCode)?.hint ?? "";

  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "products"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`);
      if (!response.ok) throw new Error("Gagal memuat daftar produk");
      const json = (await response.json()) as { data: KonsumsiProductRow[] };
      return json.data;
    },
  });
  const rows = (data ?? []).filter((row) => row.source === "konsumsi");

  async function handleDecision(row: KonsumsiProductRow, status: ProductVerificationStatusValue) {
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
    toast.success(`${row.productName} ditandai ${PRODUCT_VERIFICATION_STATUS_LABELS[status]}.`);
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
          <h3 className="text-[14.5px] font-extrabold text-[#20180f]">Product Verification — Barang Konsumsi</h3>
          <span className="rounded-full bg-[#fdeadd] px-2.5 py-0.5 text-[11px] font-bold text-[#c14a1f]">
            {rows.length} Produk
          </span>
        </div>
        <p className="text-[13px] text-[#8a7565]">
          Memastikan produk yang diajukan sesuai dengan data HS Code dan ruang lingkup program verifikasi.
          {!canEdit && " Assignment ini tidak lagi berstatus Submitted — keputusan produk bersifat baca saja."}
        </p>
      </div>

      {rows.map((row, index) => (
        <div key={row.id} className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-1 items-start gap-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fdeadd] text-[13px] font-extrabold text-[#e0662e]">
                {index + 1}
              </div>
              <div className="flex flex-1 flex-wrap gap-x-8 gap-y-3">
                <div className="min-w-40">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Nama Produk</div>
                  <div className="text-[19px] font-extrabold text-[#e0662e]">{row.productName || "—"}</div>
                </div>
                <div className="min-w-35">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Merek</div>
                  <div className="text-[19px] font-extrabold text-[#20180f]">{row.brandName || "—"}</div>
                </div>
                <div className="min-w-35">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
                  <div className="font-mono text-[19px] font-extrabold text-[#20180f]">{row.hsCode || "—"}</div>
                </div>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${PRODUCT_VERIFICATION_STATUS_BADGE[row.status]}`}>
              {PRODUCT_VERIFICATION_STATUS_LABELS[row.status]}
            </span>
          </div>

          <div className="mb-3.5 flex flex-col gap-3.5">
            <DetailField label="Uraian HS Code" value={row.hsDesc || descForHsCode(row.hsCode)} />
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <DetailField label="Kelompok Komoditas" value={row.kelompokKomoditas} />
              <DetailField label="Sub Kelompok Komoditas" value={row.subKelompokKomoditas} />
              <DetailField label="Komoditas" value={row.komoditas} />
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <DetailField label="Negara Asal" value={row.originCountryNames.join(", ")} />
              <DetailField label="Jumlah Permohonan" value={[row.estimatedVolume, row.volumeUnit].filter(Boolean).join(" ")} />
              <DetailField
                label="Harga Satuan Rata-rata"
                value={row.averageUnitPrice ? `${row.currency} ${row.averageUnitPrice}`.trim() : ""}
              />
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
            <div className="flex flex-wrap gap-2">
              {PRODUCT_VERIFICATION_STATUSES.filter((status) => status !== "PENDING").map((status) => (
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
            <p className="mt-2 text-[11px] text-[#8a7565]">
              Diverifikasi {new Date(row.verifiedAt).toLocaleString("id-ID")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
