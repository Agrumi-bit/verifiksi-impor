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

type ProductRow = {
  id: string;
  materialType: string;
  hsCode: string;
  estimatedVolume: string;
  volumeUnit: string;
  intendedUse: string;
  status: ProductVerificationStatusValue;
  note: string;
  verifiedAt: string | null;
};

type Props = { assignmentId: string; assignmentStatus: AssignmentStatusValue };

export function ProductVerificationTab({ assignmentId, assignmentStatus }: Props) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
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
    return <p className="text-sm text-[#7d8398]">Memuat daftar produk...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[14px] border border-[#e4e7f2] bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2.5">
          <MaterialIcon name="inventory_2" className="text-[#3454d1]" />
          <h3 className="text-[16px] font-bold text-[#1f2437]">Product Verification</h3>
        </div>
        <p className="text-sm text-[#7d8398]">
          Memastikan produk yang diajukan sesuai ruang lingkup program verifikasi dan didukung oleh hasil survey.
          {!canEdit && " Assignment ini tidak lagi berstatus Submitted — keputusan produk bersifat baca saja."}
        </p>
      </div>

      {rows.length === 0 && (
        <p className="rounded-[14px] border border-[#e4e7f2] bg-white p-6 text-sm text-[#7d8398]">
          Tidak ada produk yang diajukan pada aplikasi ini.
        </p>
      )}

      {rows.map((row) => (
        <div key={row.id} className="rounded-[14px] border border-[#e4e7f2] bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-[#1f2437]">{row.materialType}</div>
              <div className="font-mono text-xs text-[#8891ab]">HS Code: {row.hsCode}</div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${PRODUCT_VERIFICATION_STATUS_BADGE[row.status]}`}>
              {PRODUCT_VERIFICATION_STATUS_LABELS[row.status]}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            <div>
              <span className="text-[#8891ab]">Estimasi Volume</span>
              <div className="font-semibold text-[#1f2437]">
                {row.estimatedVolume} {row.volumeUnit}
              </div>
            </div>
            <div>
              <span className="text-[#8891ab]">Tujuan Penggunaan</span>
              <div className="font-semibold text-[#1f2437]">{row.intendedUse}</div>
            </div>
          </div>

          <textarea
            className="mb-2 w-full rounded-lg border border-[#e4e7f2] p-2.5 text-xs text-[#3d4258] outline-none disabled:bg-[#f6f7fb]"
            rows={2}
            placeholder="Catatan ketidaksesuaian (opsional)..."
            defaultValue={row.note}
            disabled={!canEdit}
            onChange={(e) => setDraftNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
          />

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {PRODUCT_VERIFICATION_STATUSES.filter((s) => s !== "PENDING").map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={savingId === row.id}
                  onClick={() => handleDecision(row, status)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 " +
                    (row.status === status
                      ? "border-[#3454d1] bg-[#e8ecfb] text-[#3454d1]"
                      : "border-[#e4e7f2] bg-white text-[#3d4258] hover:bg-[#f6f7fb]")
                  }
                >
                  {PRODUCT_VERIFICATION_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}

          {row.verifiedAt && (
            <div className="mt-2 text-[10.5px] text-[#8891ab]">
              Diverifikasi: {new Date(row.verifiedAt).toLocaleString("id-ID")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
