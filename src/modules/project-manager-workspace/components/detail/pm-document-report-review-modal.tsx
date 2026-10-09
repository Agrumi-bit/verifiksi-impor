"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { assignmentDateKey, formatAssignmentDate } from "@/lib/assignment-date";
import {
  DOC_VERIFICATION_STATUS_BADGE,
  DOC_VERIFICATION_STATUS_LABELS,
  type DocVerificationStatusValue,
} from "@/modules/verifikator-workspace/status";
import {
  DOCUMENT_REPORT_REVIEW_DECISION_BADGE,
  DOCUMENT_REPORT_REVIEW_DECISION_LABELS,
} from "@/modules/technical-analyst-workspace/document-report-review";
import type { PmApplicationDetail } from "./types";

type Decision = "APPROVED" | "REJECTED";

/**
 * PM "Review & Approve Laporan Verifikasi Dokumen" — same layout as the survey review modal: on the
 * left the verifikator's document results (counts + every document that isn't Valid), the Technical
 * Analyst's review, and the PM's own Approve/Tolak; on the right the full report. The report page
 * is print-styled (A4 pages, its own CSS), so it's embedded through its standalone PM route in an
 * iframe rather than mounted inline. Decision → `/approvals/[assignmentId]` (Approval Center's call).
 */
export function PmDocumentReportReviewModal({
  data,
  initialDecision,
  onClose,
  onDone,
}: {
  data: PmApplicationDetail;
  initialDecision?: Decision | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const dokumen = data.assignments.dokumen!;
  const taReview = data.assignments.technical?.documentReportReview ?? null;
  const ready = dokumen.status === "COMPLETED";
  const pmStatus = dokumen.pmReviewStatus as Decision | null;
  const [decision, setDecision] = useState<Decision | null>(initialDecision ?? null);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  // "Tanggal Review" — defaults to today (Asia/Jakarta), may be backdated, never in the future.
  const [reviewedAt, setReviewedAt] = useState(() => assignmentDateKey(new Date()));
  const [saving, setSaving] = useState(false);

  const checklist = data.documentChecklist ?? [];
  const count = (status: string) => checklist.filter((d) => d.status === status).length;
  const attention = checklist.filter((d) => d.status !== "VALID" && d.status !== "NOT_APPLICABLE");

  async function submit() {
    if (!decision) {
      toast.error("Pilih keputusan (Approve/Tolak) terlebih dahulu.");
      return;
    }
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Catatan penolakan wajib diisi.");
      return;
    }
    if (!reviewedAt) {
      toast.error("Pilih tanggal review terlebih dahulu.");
      return;
    }
    if (!confirmed) {
      toast.error("Centang konfirmasi terlebih dahulu.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/project-manager-workspace/approvals/${dokumen.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "laporanVerifikasi", decision, note: note.trim() || undefined, reviewedAt }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan keputusan.");
      return;
    }
    toast.success(`Laporan Verifikasi Dokumen ${decision === "APPROVED" ? "disetujui" : "ditolak"}.`);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div>
            <div className="text-[16px] font-extrabold text-[#20180f]">Review &amp; Approve Laporan Verifikasi Dokumen</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
              {dokumen.assignmentNumber}
              {dokumen.verifikatorName ? ` · Verifikator ${dokumen.verifikatorName}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row lg:overflow-hidden">
          <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[460px] lg:overflow-y-auto">
            {/* Verifikator result */}
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-extrabold text-[#20180f]">Hasil Verifikasi Dokumen</div>
                <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${ready ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#f1efe9] text-[#8a7565]"}`}>
                  {ready ? "Disubmit" : "Belum Disubmit"}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Valid", value: count("VALID"), cls: "bg-[#e2f7ea] text-[#1a9850]" },
                  { label: "Pending", value: count("PENDING"), cls: "bg-[#fdf4de] text-[#c98a1f]" },
                  { label: "Ditolak", value: count("REJECTED"), cls: "bg-[#fbe4de] text-[#c1361f]" },
                  { label: "N/A", value: count("NOT_APPLICABLE"), cls: "bg-[#ede9fe] text-[#6d28d9]" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg px-1 py-2 ${s.cls}`}>
                    <div className="text-[17px] font-extrabold">{s.value}</div>
                    <div className="text-[10px] font-bold">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 border-t border-[#f5ebe1] pt-2 text-[10.5px] text-[#8a7565]">
                {ready
                  ? `Disubmit ${formatAssignmentDate(dokumen.validatedAt)}${dokumen.verifikatorName ? ` oleh ${dokumen.verifikatorName}` : ""} · ${checklist.length} dokumen`
                  : "Verifikator belum mensubmit laporan."}
              </div>
            </div>

            {/* Documents needing attention */}
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="text-[13px] font-extrabold text-[#20180f]">Dokumen Perlu Perhatian</div>
              <div className="mt-1 text-[11px] text-[#8a7565]">Dokumen yang belum berstatus Valid pada hasil verifikator.</div>
              {attention.length === 0 ? (
                <div className="mt-2.5 rounded-md bg-[#e2f7ea] px-3 py-2 text-[12px] font-semibold text-[#1a7a4c]">Semua dokumen Valid / N/A.</div>
              ) : (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {attention.map((d) => (
                    <div key={d.key} className="flex items-start justify-between gap-2 rounded-md border border-[#f2e6da] px-2.5 py-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-[#20180f]">{d.label}</div>
                        <div className="text-[10.5px] text-[#a68f80]">
                          {d.category}
                          {!d.hasDocument ? " · Belum diunggah" : ""}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          DOC_VERIFICATION_STATUS_BADGE[d.status as DocVerificationStatusValue] ?? DOC_VERIFICATION_STATUS_BADGE.PENDING
                        }`}
                      >
                        {DOC_VERIFICATION_STATUS_LABELS[d.status as DocVerificationStatusValue] ?? d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Technical Analyst review */}
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-extrabold text-[#20180f]">Review Technical Analyst</div>
                {taReview?.decision ? (
                  <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${DOCUMENT_REPORT_REVIEW_DECISION_BADGE[taReview.decision]}`}>
                    {DOCUMENT_REPORT_REVIEW_DECISION_LABELS[taReview.decision]}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#f1efe9] px-2.5 py-0.75 text-[10.5px] font-bold text-[#8a7565]">Belum Direview</span>
                )}
              </div>
              <div className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-[#5c4a3d]">
                {taReview?.note || (taReview?.decision ? "Tidak ada catatan." : "Technical Analyst belum mereview laporan ini.")}
              </div>
              {taReview?.verifiedAt && (
                <div className="mt-2 border-t border-[#f5ebe1] pt-2 text-[10.5px] text-[#8a7565]">
                  Direview oleh {taReview.verifiedByName ?? "Technical Analyst"} · {formatAssignmentDate(taReview.verifiedAt)}
                </div>
              )}
            </div>

            {/* PM decision */}
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="mb-2 text-[13px] font-extrabold text-[#20180f]">Keputusan Project Manager</div>
              {pmStatus ? (
                <div>
                  <span
                    className={`rounded-full px-2.5 py-0.75 text-[11px] font-bold ${
                      pmStatus === "APPROVED" ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#fbe4de] text-[#c1361f]"
                    }`}
                  >
                    {pmStatus === "APPROVED" ? "Disetujui" : "Ditolak"} · {formatAssignmentDate(dokumen.pmReviewedAt)}
                  </span>
                  {dokumen.pmReviewNote && <div className="mt-2 text-[12px] text-[#6b5b4c]">Catatan: {dokumen.pmReviewNote}</div>}
                </div>
              ) : !ready ? (
                <div className="rounded-lg bg-[#faf1de] px-3 py-2 text-[12px] text-[#a6791f]">Menunggu verifikator mensubmit laporan.</div>
              ) : (
                <>
                  {taReview?.decision !== "VERIFIED" && (
                    <div className="mb-2.5 flex items-start gap-2 rounded-lg bg-[#faf1de] px-3 py-2 text-[11.5px] text-[#a6791f]">
                      <MaterialIcon name="info" className="mt-0.5 text-[15px]" />
                      {taReview?.decision
                        ? `Technical Analyst menandai laporan ini ${DOCUMENT_REPORT_REVIEW_DECISION_LABELS[taReview.decision]} — periksa catatannya sebelum menyetujui.`
                        : "Technical Analyst belum mereview laporan ini."}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {(["APPROVED", "REJECTED"] as Decision[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={saving}
                        onClick={() => setDecision(d)}
                        className={
                          "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-bold disabled:opacity-50 " +
                          (decision === d
                            ? d === "APPROVED"
                              ? "border-[#1a9850] bg-[#e2f7ea] text-[#1a9850]"
                              : "border-[#c1361f] bg-[#fbe4de] text-[#c1361f]"
                            : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
                        }
                      >
                        <MaterialIcon name={d === "APPROVED" ? "task_alt" : "cancel"} className="text-[15px]" />
                        {d === "APPROVED" ? "Approve" : "Tolak"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder={decision === "REJECTED" ? "Alasan penolakan (wajib)..." : "Catatan (opsional)..."}
                    disabled={saving}
                    className="mt-3 w-full resize-none rounded-lg border border-[#e8dccd] bg-[#faf7f4] p-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f2ece5]"
                  />
                  <div className="mt-3">
                    <label className="mb-1.5 block text-[11.5px] font-bold text-[#20180f]" htmlFor="pm-review-date">
                      Tanggal Review
                    </label>
                    <input
                      id="pm-review-date"
                      type="date"
                      value={reviewedAt}
                      max={assignmentDateKey(new Date())}
                      onChange={(event) => setReviewedAt(event.target.value)}
                      disabled={saving}
                      className="w-full rounded-lg border border-[#e8dccd] bg-[#faf7f4] px-2.5 py-2 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f2ece5]"
                    />
                    <p className="mt-1 text-[10.5px] text-[#8a7565]">Tanggal ini tercetak sebagai TANGGAL TERBIT pada sampul laporan bila disetujui.</p>
                  </div>
                  <label className="mt-3 flex items-start gap-2 text-[11.5px] text-[#20180f]">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      disabled={saving}
                      className="mt-0.5"
                    />
                    <span>Saya sudah mereview Laporan Verifikasi Dokumen ini.</span>
                  </label>
                  <button
                    type="button"
                    disabled={saving || !decision || !confirmed || !reviewedAt || (decision === "REJECTED" && !note.trim())}
                    onClick={submit}
                    className="mt-3 w-full rounded-lg bg-[#16a34a] py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
                  >
                    {saving ? "Menyimpan…" : "Submit"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="min-h-[70vh] flex-1 overflow-hidden rounded-lg border border-[#efe2d4] bg-[#f4f1ed]">
            <iframe
              title="Laporan Verifikasi Dokumen"
              src={`/project-manager-workspace/assignments/${dokumen.assignmentNumber}/document-report`}
              className="size-full min-h-[70vh] border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
