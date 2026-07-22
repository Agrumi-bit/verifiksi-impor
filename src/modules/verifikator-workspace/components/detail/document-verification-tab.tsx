"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import {
  DOC_VERIFICATION_STATUSES,
  DOC_VERIFICATION_STATUS_BADGE,
  DOC_VERIFICATION_STATUS_LABELS,
  type DocVerificationStatusValue,
} from "../../status";
import type { AssignmentStatusValue } from "../../status";

type DocumentRow = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
  status: DocVerificationStatusValue;
  note: string;
  verifiedAt: string | null;
};

function basename(path: string | null): string {
  if (!path) return "Belum diunggah";
  return path.split("/").pop() ?? path;
}

type Props = { assignmentId: string; assignmentStatus: AssignmentStatusValue };

export function DocumentVerificationTab({ assignmentId, assignmentStatus }: Props) {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const canEdit = assignmentStatus === "SUBMITTED";

  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "documents"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/documents`);
      if (!response.ok) throw new Error("Gagal memuat daftar dokumen");
      const json = (await response.json()) as { data: DocumentRow[] };
      return json.data;
    },
  });

  const rows = data ?? [];
  const grouped = rows.reduce<Record<string, DocumentRow[]>>((acc, row) => {
    (acc[row.category] ??= []).push(row);
    return acc;
  }, {});

  async function handleDecision(row: DocumentRow, status: DocVerificationStatusValue) {
    setSavingKey(row.key);
    const note = draftNotes[row.key] ?? row.note;
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: row.key, status, note }),
    });
    setSavingKey(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status dokumen");
      return;
    }
    toast.success(`${row.label} ditandai ${DOC_VERIFICATION_STATUS_LABELS[status]}.`);
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  if (isLoading) {
    return <p className="text-sm text-[#7d8398]">Memuat daftar dokumen...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[14px] border border-[#e4e7f2] bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2.5">
          <MaterialIcon name="fact_check" className="text-[#3454d1]" />
          <h3 className="text-[16px] font-bold text-[#1f2437]">Document Verification</h3>
        </div>
        <p className="text-sm text-[#7d8398]">
          Memastikan setiap dokumen persyaratan yang diunggah pada saat pengajuan memenuhi persyaratan administrasi.
          {!canEdit && " Assignment ini tidak lagi berstatus Submitted — keputusan dokumen bersifat baca saja."}
        </p>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-[14px] border border-[#e4e7f2] bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-[#8891ab]">{category}</h4>
          <div className="flex flex-col gap-3">
            {items.map((row) => (
              <div key={row.key} className="rounded-lg border border-[#e4e7f2] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#1f2437]">{row.label}</div>
                    <div className="flex items-center gap-1.5 text-xs text-[#8891ab]">
                      <MaterialIcon name="description" className="text-sm" />
                      {basename(row.documentPath)}
                      {row.documentPath && (
                        <span className="italic text-[#c2c6d3]"> · pratinjau belum tersedia</span>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[row.status]}`}>
                    {DOC_VERIFICATION_STATUS_LABELS[row.status]}
                  </span>
                </div>

                <textarea
                  className="mb-2 w-full rounded-lg border border-[#e4e7f2] p-2.5 text-xs text-[#3d4258] outline-none disabled:bg-[#f6f7fb]"
                  rows={2}
                  placeholder="Catatan verifikasi (opsional)..."
                  defaultValue={row.note}
                  disabled={!canEdit}
                  onChange={(e) => setDraftNotes((prev) => ({ ...prev, [row.key]: e.target.value }))}
                />

                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    {DOC_VERIFICATION_STATUSES.filter((s) => s !== "PENDING").map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={savingKey === row.key}
                        onClick={() => handleDecision(row, status)}
                        className={
                          "rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 " +
                          (row.status === status
                            ? "border-[#3454d1] bg-[#e8ecfb] text-[#3454d1]"
                            : "border-[#e4e7f2] bg-white text-[#3d4258] hover:bg-[#f6f7fb]")
                        }
                      >
                        {DOC_VERIFICATION_STATUS_LABELS[status]}
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
        </div>
      ))}
    </div>
  );
}
