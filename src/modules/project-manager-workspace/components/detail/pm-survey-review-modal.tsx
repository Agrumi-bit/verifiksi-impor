"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { ReportRouter } from "@/modules/surveyor-workspace/components/report/report-router";
import { LOCATION_TYPE_LABELS } from "@/modules/verifikator-workspace/status";
import { REPORT_CHECKLIST_SECTIONS, reportResultLabels } from "@/modules/verifikator-workspace/report-checklist-items";
import type { ReportItemResultValue, ReportVerificationState } from "@/modules/verifikator-workspace/report-verification";
import { formatAssignmentDate } from "@/lib/assignment-date";

type Decision = "APPROVED" | "REJECTED";

const RESULT_STYLE: Record<ReportItemResultValue, string> = {
  PASS: "border-[#9fd8b4] bg-[#e2f7ea] text-[#1a9850]",
  FAIL: "border-[#f0b8aa] bg-[#fbe4de] text-[#c1361f]",
  NA: "border-[#ddd2c5] bg-[#f2ece5] text-[#6b5b4c]",
};
const VERIFIKATOR_DECISION: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Verified", className: "bg-[#e2f7ea] text-[#1a9850]" },
  REJECTED: { label: "Reject", className: "bg-[#fbe4de] text-[#c1361f]" },
  REVISION: { label: "Revisi", className: "bg-[#faf1de] text-[#a6791f]" },
};

/**
 * PM "Review & Approve Laporan Survey" — mirrors the verifikator's "Review Laporan Verifikasi
 * Lapangan" modal: the verifikator's checklist results + conclusion (read-only) and the PM's own
 * Approve/Tolak decision on the left, the full surveyor report on the right. The decision goes to
 * the same `/approvals/[assignmentId]` endpoint as the Approval Center.
 */
export function PmSurveyReviewModal({
  assignment,
  visit,
  sharedLocations,
  initialDecision,
  onClose,
  onDone,
}: {
  assignment: { id: string; assignmentNumber: string; pmReviewStatus: string | null; pmReviewNote: string | null; pmReviewedAt: string | null; ready: boolean };
  visit: { id: string; locationType: string; address: string; city: string | null };
  /** Number of locations covered by this survey assignment (decision applies to all of them). */
  sharedLocations: number;
  initialDecision?: Decision | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [decision, setDecision] = useState<Decision | null>(initialDecision ?? null);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const label = LOCATION_TYPE_LABELS[visit.locationType as keyof typeof LOCATION_TYPE_LABELS] ?? visit.locationType;
  const decided = Boolean(assignment.pmReviewStatus);

  const { data: state, isLoading } = useQuery({
    queryKey: ["project-manager-workspace", "assignments", assignment.assignmentNumber, "locations", visit.id, "report-verification"],
    queryFn: async () => {
      const response = await fetch(
        `/api/project-manager-workspace/assignments/${assignment.assignmentNumber}/locations/${visit.id}/report-verification`,
      );
      if (!response.ok) throw new Error("Gagal memuat hasil review verifikator");
      const json = (await response.json()) as { data: ReportVerificationState };
      return json.data;
    },
  });

  async function submit() {
    if (!decision) {
      toast.error("Pilih keputusan (Approve/Tolak) terlebih dahulu.");
      return;
    }
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Catatan penolakan wajib diisi.");
      return;
    }
    if (!confirmed) {
      toast.error("Centang konfirmasi terlebih dahulu.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/project-manager-workspace/approvals/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "laporanSurvey", decision, note: note.trim() || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan keputusan.");
      return;
    }
    toast.success(`Laporan Survey ${assignment.assignmentNumber} ${decision === "APPROVED" ? "disetujui" : "ditolak"}.`);
    onDone();
  }

  const verifikatorDecision = state?.decision ? VERIFIKATOR_DECISION[state.decision] : null;
  const counts = Object.values(state?.items ?? {}).reduce(
    (acc, item) => {
      if (item.result) acc[item.result] += 1;
      return acc;
    },
    { PASS: 0, FAIL: 0, NA: 0 } as Record<ReportItemResultValue, number>,
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div>
            <div className="text-[16px] font-extrabold text-[#20180f]">Review &amp; Approve Laporan Survey — {label}</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
              {assignment.assignmentNumber} · {visit.address}
              {visit.city ? `, ${visit.city}` : ""}
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
          <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[480px] lg:overflow-y-auto">
            {/* Verifikator conclusion */}
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-extrabold text-[#20180f]">Kesimpulan Verifikator</div>
                <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${verifikatorDecision?.className ?? "bg-[#f1efe9] text-[#8a7565]"}`}>
                  {verifikatorDecision?.label ?? "Belum Direview"}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5 text-[10.5px] font-bold">
                <span className="rounded-full bg-[#e2f7ea] px-2 py-0.5 text-[#1a9850]">{counts.PASS} Sesuai</span>
                <span className="rounded-full bg-[#fbe4de] px-2 py-0.5 text-[#c1361f]">{counts.FAIL} Tidak Sesuai</span>
                <span className="rounded-full bg-[#f2ece5] px-2 py-0.5 text-[#6b5b4c]">{counts.NA} N/A</span>
              </div>
              <div className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-[#5c4a3d]">
                {isLoading
                  ? "Memuat…"
                  : state?.decisionNote || (state?.decision ? "Tidak ada catatan dari verifikator." : "Laporan lokasi ini belum direview verifikator.")}
              </div>
              {state?.verifiedAt && (
                <div className="mt-2 border-t border-[#f5ebe1] pt-2 text-[10.5px] text-[#8a7565]">
                  Diperiksa oleh {state.verifiedByName ?? "verifikator"} · {formatAssignmentDate(state.verifiedAt)}
                </div>
              )}
            </div>

            {/* Verifikator checklist (read-only) */}
            {REPORT_CHECKLIST_SECTIONS.map((section) => (
              <div key={section.key} className="rounded-lg border border-[#efe2d4] p-3.5">
                <div className="text-[13px] font-extrabold text-[#20180f]">{section.title}</div>
                <div className="mt-1 text-[11px] text-[#8a7565]">{section.description}</div>
                <div className="mt-3 flex flex-col gap-2">
                  {section.items.map((item) => {
                    const value = state?.items[item.id];
                    const labels = reportResultLabels(item);
                    const resultLabel =
                      value?.result === "PASS" ? labels.pass : value?.result === "FAIL" ? labels.fail : value?.result === "NA" ? labels.na : null;
                    return (
                      <div key={item.id} className="rounded-lg border border-[#efe2d4] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[12px] font-extrabold text-[#20180f]">
                            {item.no}. {item.title}
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${
                              value?.result ? RESULT_STYLE[value.result] : "border-[#e8dccd] bg-white text-[#a68f80]"
                            }`}
                          >
                            {resultLabel ?? "Belum dinilai"}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-[#6b5b4c]">{item.question}</div>
                        {value?.note && (
                          <div className="mt-1.5 rounded-md bg-[#faf7f4] p-2 text-[11px] text-[#4a4038]">
                            <span className="font-bold">Catatan: </span>
                            {value.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* PM decision */}
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="mb-2 text-[13px] font-extrabold text-[#20180f]">Keputusan Project Manager</div>
              {sharedLocations > 1 && (
                <div className="mb-2 text-[11px] text-[#8a7565]">
                  Keputusan berlaku untuk seluruh {sharedLocations} lokasi pada penugasan {assignment.assignmentNumber}.
                </div>
              )}
              {decided ? (
                <div>
                  <span
                    className={`rounded-full px-2.5 py-0.75 text-[11px] font-bold ${
                      assignment.pmReviewStatus === "APPROVED" ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#fbe4de] text-[#c1361f]"
                    }`}
                  >
                    {assignment.pmReviewStatus === "APPROVED" ? "Disetujui" : "Ditolak"} · {formatAssignmentDate(assignment.pmReviewedAt)}
                  </span>
                  {assignment.pmReviewNote && <div className="mt-2 text-[12px] text-[#6b5b4c]">Catatan: {assignment.pmReviewNote}</div>}
                </div>
              ) : !assignment.ready ? (
                <div className="rounded-lg bg-[#faf1de] px-3 py-2 text-[12px] text-[#a6791f]">
                  Menunggu seluruh survey lokasi pada penugasan ini selesai.
                </div>
              ) : (
                <>
                  {state && state.decision !== "VERIFIED" && (
                    <div className="mb-2.5 flex items-start gap-2 rounded-lg bg-[#faf1de] px-3 py-2 text-[11.5px] text-[#a6791f]">
                      <MaterialIcon name="info" className="mt-0.5 text-[15px]" />
                      {state.decision
                        ? "Verifikator tidak menyatakan laporan lokasi ini Verified — periksa kesimpulannya sebelum menyetujui."
                        : "Laporan lokasi ini belum direview verifikator."}
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
                  {decision === "APPROVED" && (
                    <p className="mt-1 text-[10.5px] text-[#8a7565]">
                      Sampul laporan berganti menjadi TANGGAL TERBIT dengan tanggal hari ini.
                    </p>
                  )}
                  <label className="mt-3 flex items-start gap-2 text-[11.5px] text-[#20180f]">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      disabled={saving}
                      className="mt-0.5"
                    />
                    <span>Saya sudah mereview laporan survey dan hasil pemeriksaan verifikator ini.</span>
                  </label>
                  <button
                    type="button"
                    disabled={saving || !decision || !confirmed || (decision === "REJECTED" && !note.trim())}
                    onClick={submit}
                    className="mt-3 w-full rounded-lg bg-[#16a34a] py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
                  >
                    {saving ? "Menyimpan…" : "Submit"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="min-h-[60vh] flex-1 overflow-auto rounded-lg border border-[#efe2d4] bg-white p-4">
            <ReportRouter assignmentId={assignment.assignmentNumber} locationId={visit.id} basePath="/api/project-manager-workspace" />
          </div>
        </div>
      </div>
    </div>
  );
}
