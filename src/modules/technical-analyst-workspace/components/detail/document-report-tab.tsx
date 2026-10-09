"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAssignmentDate } from "@/lib/assignment-date";
import {
  DOCUMENT_REPORT_REVIEW_DECISION_BADGE,
  DOCUMENT_REPORT_REVIEW_DECISION_LABELS,
  DOCUMENT_REPORT_REVIEW_ITEMS,
  type DocumentReportReview,
  type DocumentReportReviewDecision,
  type DocumentReportReviewItemKey,
  type DocumentReportReviewResult,
} from "../../document-report-review";

type DocumentReportTabProps = {
  assignmentNumber: string;
  dokumen: { assignmentNumber: string; status: string } | null;
};

type ReviewResponse = { review: DocumentReportReview; reportAvailable: boolean; canEdit: boolean };

function todayInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function DocumentReportTab({ assignmentNumber, dokumen }: DocumentReportTabProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const queryKey = ["technical-analyst-workspace", "document-report-review", assignmentNumber];
  const { data } = useQuery({
    queryKey,
    enabled: dokumen?.status === "COMPLETED",
    queryFn: async () => {
      const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentNumber}/document-report-review`);
      if (!response.ok) throw new Error("Gagal memuat review laporan");
      return ((await response.json()) as { data: ReviewResponse }).data;
    },
  });

  if (!dokumen) {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Belum ada penugasan verifikasi dokumen untuk permohonan ini.
      </div>
    );
  }

  if (dokumen.status !== "COMPLETED") {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Verifikasi dokumen masih berlangsung — laporan tersedia setelah verifikator menyelesaikan review.
      </div>
    );
  }

  const review = data?.review ?? null;
  const decision = review?.decision ?? null;

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-[13.5px] font-bold text-[#2b2420]">Laporan Verifikasi Dokumen</div>
          <div className="mt-0.5 text-[12px] text-[#8a7565]">{dokumen.assignmentNumber}</div>
        </div>
        <Link
          href={`/technical-analyst-workspace/assignments/${assignmentNumber}/document-report`}
          className="flex items-center gap-1.5 rounded-lg border border-[#f0ded0] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#2b2420]"
        >
          <MaterialIcon name="description" className="text-[15px]" />
          Lihat Laporan
        </Link>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#f5ebe1] p-4">
        {decision ? (
          <div className="flex flex-col gap-1.5 rounded-[9px] bg-[#f7f2ec] px-3.5 py-2.5 text-[12px] text-[#4a4038]">
            <div className="flex flex-wrap items-center gap-2">
              <MaterialIcon name="fact_check" className="text-[16px] text-[#16a34a]" />
              <span>Sudah direview:</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${DOCUMENT_REPORT_REVIEW_DECISION_BADGE[decision]}`}>
                {DOCUMENT_REPORT_REVIEW_DECISION_LABELS[decision]}
              </span>
              {review?.verifiedAt && <span>· {formatAssignmentDate(review.verifiedAt)}</span>}
              {review?.verifiedByName && <span>· oleh {review.verifiedByName}</span>}
            </div>
            {review?.note && <div className="pl-6 text-[12px] text-[#6b5b4c]">Catatan: {review.note}</div>}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[9px] bg-[#faf1de] px-3.5 py-2.5 text-[12px] font-semibold text-[#a6791f]">
            <MaterialIcon name="pending_actions" className="text-[16px]" />
            Laporan belum direview. Review dengan hasil Verified diperlukan sebelum Approve analisis teknis.
          </div>
        )}

        <button
          type="button"
          disabled={!data?.canEdit}
          onClick={() => setReviewOpen(true)}
          className="flex items-center justify-center gap-2 rounded-[9px] bg-[#16a34a] py-3 text-[13.5px] font-bold text-white disabled:opacity-60"
        >
          <MaterialIcon name={decision ? "replay" : "play_circle"} className="text-[18px]" />
          {decision ? "Review Ulang Laporan Verifikasi Dokumen" : "Mulai Review Laporan Verifikasi Dokumen"}
        </button>
      </div>

      {reviewOpen && review && (
        <ReviewDialog
          assignmentNumber={assignmentNumber}
          initial={review}
          onClose={() => setReviewOpen(false)}
          queryKey={queryKey}
        />
      )}
    </div>
  );
}

function ReviewDialog({
  assignmentNumber,
  initial,
  onClose,
  queryKey,
}: {
  assignmentNumber: string;
  initial: DocumentReportReview;
  onClose: () => void;
  queryKey: string[];
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Record<string, { result: DocumentReportReviewResult | null; note: string }>>(() =>
    Object.fromEntries(
      DOCUMENT_REPORT_REVIEW_ITEMS.map((item) => [item.key, { result: initial.items[item.key]?.result ?? null, note: initial.items[item.key]?.note ?? "" }]),
    ),
  );
  const [decision, setDecision] = useState<DocumentReportReviewDecision | null>(initial.decision);
  const [note, setNote] = useState(initial.note ?? "");
  const [verifiedAt, setVerifiedAt] = useState(initial.verifiedAt ?? todayInputValue());
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const anyFail = Object.values(items).some((i) => i.result === "FAIL");

  function setItem(key: DocumentReportReviewItemKey, patch: Partial<{ result: DocumentReportReviewResult | null; note: string }>) {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function save() {
    if (DOCUMENT_REPORT_REVIEW_ITEMS.some((item) => !items[item.key].result)) {
      toast.error("Nilai seluruh checklist (Sesuai / Tidak Sesuai) terlebih dahulu.");
      return;
    }
    if (!decision) {
      toast.error("Pilih keputusan (Verified/Revisi/Reject) terlebih dahulu.");
      return;
    }
    if (decision === "VERIFIED" && anyFail) {
      toast.error("Laporan tidak dapat dinyatakan Verified selama ada checklist yang Tidak Sesuai.");
      return;
    }
    if (decision !== "VERIFIED" && !note.trim()) {
      toast.error("Catatan wajib diisi untuk keputusan Revisi atau Reject.");
      return;
    }
    if (!confirmed) {
      toast.error("Centang konfirmasi terlebih dahulu.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentNumber}/document-report-review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: Object.fromEntries(Object.entries(items).map(([key, value]) => [key, { result: value.result, note: value.note.trim() || null }])),
        decision,
        note: note.trim() || undefined,
        verifiedAt,
        confirmed,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      toast.error(err?.error ?? "Gagal menyimpan review.");
      return;
    }
    toast.success(`Laporan Verifikasi Dokumen ditandai ${DOCUMENT_REPORT_REVIEW_DECISION_LABELS[decision]}.`);
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["technical-analyst-workspace", "assignment", assignmentNumber] });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[94vh] w-[96vw] max-w-[1500px] flex-col gap-3 overflow-hidden sm:max-w-[1500px]">
        <DialogHeader>
          <DialogTitle>Review Laporan Verifikasi Dokumen</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto lg:h-[70vh] lg:flex-row lg:overflow-hidden">
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[500px] lg:overflow-y-auto lg:pr-1">
        <div className="flex flex-col gap-2.5">
          {DOCUMENT_REPORT_REVIEW_ITEMS.map((item, index) => {
            const value = items[item.key];
            return (
              <div key={item.key} className="rounded-lg border border-[#f0ded0] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-[#20180f]">
                      {index + 1}. {item.label}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-[#8a7565]">{item.description}</div>
                  </div>
                  <div className="flex gap-1.5">
                    {(["PASS", "FAIL"] as const).map((result) => (
                      <button
                        key={result}
                        type="button"
                        onClick={() => setItem(item.key, { result })}
                        className={`rounded-md border px-2.5 py-1 text-[11.5px] font-bold ${
                          value.result === result
                            ? result === "PASS"
                              ? "border-[#1a9850] bg-[#e2f7ea] text-[#1a9850]"
                              : "border-[#c1361f] bg-[#fbe4de] text-[#c1361f]"
                            : "border-[#e1bfb3] bg-white text-[#6b5b4c]"
                        }`}
                      >
                        {result === "PASS" ? "Sesuai" : "Tidak Sesuai"}
                      </button>
                    ))}
                  </div>
                </div>
                {value.result === "FAIL" && (
                  <input
                    type="text"
                    value={value.note}
                    onChange={(e) => setItem(item.key, { note: e.target.value })}
                    placeholder="Catatan ketidaksesuaian..."
                    className="mt-2 w-full rounded-lg border border-input px-3 py-2 text-[12.5px] outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div>
          <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Keputusan</div>
          <div className="flex gap-2">
            {(["VERIFIED", "REVISION", "REJECTED"] as DocumentReportReviewDecision[]).map((d) => (
              <button
                key={d}
                type="button"
                disabled={d === "VERIFIED" && anyFail}
                onClick={() => setDecision(d)}
                className={`flex-1 rounded-lg border py-2 text-[12.5px] font-bold disabled:opacity-50 ${
                  decision === d ? DOCUMENT_REPORT_REVIEW_DECISION_BADGE[d] + " border-current" : "border-[#e1bfb3] bg-white text-[#6b5b4c]"
                }`}
              >
                {DOCUMENT_REPORT_REVIEW_DECISION_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="w-full rounded-lg border border-input p-3 text-sm outline-none"
          rows={3}
          placeholder={decision && decision !== "VERIFIED" ? "Catatan untuk verifikator (wajib diisi)..." : "Catatan (opsional)..."}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-[12.5px] font-bold text-[#20180f]">
            Tanggal Diperiksa
            <input
              type="date"
              value={verifiedAt}
              max={todayInputValue()}
              onChange={(e) => setVerifiedAt(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input px-3 py-2 text-[13px] font-normal outline-none"
            />
          </label>
        </div>

        <label className="flex items-start gap-2 text-[12.5px] text-[#4a4038]">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          Saya telah memeriksa Laporan Verifikasi Dokumen dan hasil review di atas sesuai dengan pemeriksaan saya.
        </label>
        </div>

        <div className="min-h-[70vh] flex-1 overflow-hidden rounded-lg border border-[#efe2d4] bg-[#f4f1ed]">
          <iframe
            title="Laporan Verifikasi Dokumen"
            src={`/technical-analyst-workspace/assignments/${assignmentNumber}/document-report`}
            className="size-full min-h-[70vh] border-0"
          />
        </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#16a34a] text-white hover:bg-[#13843d]">
            {saving ? "Menyimpan..." : "Simpan Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
