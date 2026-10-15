"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { Button } from "@/components/ui/button";
import { assignmentDateKey, formatAssignmentDate } from "@/lib/assignment-date";
import {
  technicalModuleKeysFor,
  TECHNICAL_MODULE_LABELS,
  TECHNICAL_MODULE_STATUS_BADGE,
  TECHNICAL_MODULE_STATUS_LABELS,
} from "@/modules/technical-analyst-workspace/status";
import type { PmApplicationDetail } from "./types";

type Decision = "APPROVED" | "REJECTED" | "REVISION";

const DECISION_UI: Record<Decision, { label: string; icon: string; on: string; done: string }> = {
  APPROVED: { label: "Approve", icon: "task_alt", on: "border-[#1a9850] bg-[#e2f7ea] text-[#1a9850]", done: "disetujui" },
  REVISION: { label: "Revisi", icon: "undo", on: "border-[#c98a1f] bg-[#fdf4de] text-[#a6791f]", done: "dikembalikan ke Technical Analyst untuk revisi" },
  REJECTED: { label: "Tolak", icon: "cancel", on: "border-[#c1361f] bg-[#fbe4de] text-[#c1361f]", done: "ditolak" },
};

/**
 * PM's review + approval of the Laporan Analisis Teknis (Analisis tab) — same `laporanTeknis`
 * approval the Approval Center uses (pmReviewStatus on the technical assignment). Approve / Tolak,
 * or Revisi: reopens the Technical Analyst's assignment with the PM's note.
 */
export function TechnicalReportApproval({ data, applicationNumber }: { data: PmApplicationDetail; applicationNumber: string }) {
  const queryClient = useQueryClient();
  const technical = data.assignments.technical;
  const [dialog, setDialog] = useState<Decision | "VIEW" | null>(null);

  if (!technical) return null;
  const ready = technical.status === "COMPLETED";
  const pmStatus = technical.pmReviewStatus as "APPROVED" | "REJECTED" | null;
  const revisionRequested = !pmStatus && !ready && Boolean(technical.pmReviewNote);

  function refresh() {
    setDialog(null);
    queryClient.invalidateQueries({ queryKey: ["project-manager-workspace", "applications", data.verificationType, applicationNumber] });
    queryClient.invalidateQueries({ queryKey: ["project-manager-workspace", "dashboard"] });
  }

  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-4">
      <div className="mb-3 text-[13.5px] font-extrabold text-[#20180f]">Review & Persetujuan Laporan Analisis Teknis</div>
      <div className="flex flex-col gap-2.5 text-[12.5px] text-[#4a4038]">
        <Row icon="person" label="Technical Analyst">
          {ready ? (
            <>
              Disubmit {formatAssignmentDate(technical.validatedAt)}
              {technical.technicalReviewerName ? ` oleh ${technical.technicalReviewerName}` : ""}
            </>
          ) : (
            <span className="text-[#a68f80]">Belum disubmit Technical Analyst</span>
          )}
        </Row>
        <Row icon="verified" label="Persetujuan PM">
          {pmStatus ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${pmStatus === "APPROVED" ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#fbe4de] text-[#c1361f]"}`}>
                {pmStatus === "APPROVED" ? "Disetujui" : "Ditolak"}
              </span>
              <span>{formatAssignmentDate(technical.pmReviewedAt)}</span>
              {technical.pmReviewNote && <span className="w-full text-[#6b5b4c]">Catatan: {technical.pmReviewNote}</span>}
            </span>
          ) : revisionRequested ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#fdf4de] px-2.5 py-0.5 text-[11px] font-bold text-[#a6791f]">Revisi diminta</span>
              <span>{formatAssignmentDate(technical.pmReviewedAt)} · menunggu Technical Analyst submit ulang</span>
              <span className="w-full text-[#6b5b4c]">Catatan: {technical.pmReviewNote}</span>
            </span>
          ) : (
            <span className="text-[#a68f80]">Belum diputuskan</span>
          )}
        </Row>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {pmStatus ? (
          <>
            <Button type="button" variant="outline" onClick={() => setDialog("VIEW")} className="border-[#e1bfb3]">
              <MaterialIcon name="visibility" className="text-[16px]" />
              Lihat Review
            </Button>
            <Button type="button" variant="outline" onClick={() => setDialog("REVISION")} className="border-[#c98a1f] text-[#a6791f]">
              <MaterialIcon name="undo" className="text-[16px]" />
              Kembalikan untuk Revisi
            </Button>
          </>
        ) : (
          <>
            <Button type="button" disabled={!ready} onClick={() => setDialog("APPROVED")} className="bg-[#16a34a] text-white hover:bg-[#13843d]">
              <MaterialIcon name="task_alt" className="text-[16px]" />
              {ready ? "Review & Approve Laporan" : "Menunggu Laporan Disubmit"}
            </Button>
            <Button type="button" variant="outline" disabled={!ready} onClick={() => setDialog("REJECTED")} className="border-[#e1bfb3] text-[#c1361f]">
              <MaterialIcon name="cancel" className="text-[16px]" />
              Tolak
            </Button>
            <Button type="button" variant="outline" disabled={!ready} onClick={() => setDialog("REVISION")} className="border-[#c98a1f] text-[#a6791f]">
              <MaterialIcon name="undo" className="text-[16px]" />
              Revisi
            </Button>
          </>
        )}
      </div>

      {dialog && <ReviewModal data={data} initialDecision={dialog === "VIEW" ? null : dialog} onClose={() => setDialog(null)} onDone={refresh} />}
    </div>
  );
}

function ReviewModal({
  data,
  initialDecision,
  onClose,
  onDone,
}: {
  data: PmApplicationDetail;
  initialDecision: Decision | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const technical = data.assignments.technical!;
  const ready = technical.status === "COMPLETED";
  const pmStatus = technical.pmReviewStatus as "APPROVED" | "REJECTED" | null;
  const [reopen, setReopen] = useState(initialDecision === "REVISION" && Boolean(pmStatus));
  const [decision, setDecision] = useState<Decision | null>(initialDecision);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reviewedAt, setReviewedAt] = useState(() => assignmentDateKey(new Date()));
  const [saving, setSaving] = useState(false);
  const moduleKeys = technicalModuleKeysFor(data.verificationType, data.payload?.importTypes);

  async function submit() {
    if (!decision) return;
    if (decision !== "APPROVED" && !note.trim()) {
      toast.error(decision === "REVISION" ? "Catatan revisi wajib diisi." : "Catatan penolakan wajib diisi.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/project-manager-workspace/approvals/${technical.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "laporanTeknis", decision, note: note.trim() || undefined, reviewedAt }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan keputusan.");
      return;
    }
    toast.success(`Laporan Analisis Teknis ${DECISION_UI[decision].done}.`);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div>
            <div className="text-[16px] font-extrabold text-[#20180f]">Review &amp; Approve Laporan Analisis Teknis</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
              {technical.assignmentNumber}
              {technical.technicalReviewerName ? ` · Technical Analyst ${technical.technicalReviewerName}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]">
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row lg:overflow-hidden">
          <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[440px] lg:overflow-y-auto">
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="mb-2 text-[13px] font-extrabold text-[#20180f]">Hasil Analisis per Modul</div>
              <div className="flex flex-col gap-1.5">
                {moduleKeys.map((key) => {
                  const status = (technical.technicalAnalysisData[key]?.status ?? "PENDING") as keyof typeof TECHNICAL_MODULE_STATUS_LABELS;
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-[#f2e6da] px-2.5 py-2">
                      <span className="text-[12px] font-bold text-[#20180f]">{TECHNICAL_MODULE_LABELS[key]}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${TECHNICAL_MODULE_STATUS_BADGE[status] ?? TECHNICAL_MODULE_STATUS_BADGE.PENDING}`}>
                        {TECHNICAL_MODULE_STATUS_LABELS[status] ?? status}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2.5 border-t border-[#f5ebe1] pt-2 text-[10.5px] text-[#8a7565]">
                {ready
                  ? `Disubmit ${formatAssignmentDate(technical.validatedAt)}${technical.technicalReviewerName ? ` oleh ${technical.technicalReviewerName}` : ""}`
                  : "Technical Analyst belum mensubmit laporan."}
              </div>
            </div>

            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="mb-2 text-[13px] font-extrabold text-[#20180f]">Keputusan Project Manager</div>
              {pmStatus && !reopen ? (
                <div>
                  <span className={`rounded-full px-2.5 py-0.75 text-[11px] font-bold ${pmStatus === "APPROVED" ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#fbe4de] text-[#c1361f]"}`}>
                    {pmStatus === "APPROVED" ? "Disetujui" : "Ditolak"} · {formatAssignmentDate(technical.pmReviewedAt)}
                  </span>
                  {technical.pmReviewNote && <div className="mt-2 text-[12px] text-[#6b5b4c]">Catatan: {technical.pmReviewNote}</div>}
                  <button
                    type="button"
                    onClick={() => {
                      setReopen(true);
                      setDecision("REVISION");
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#c98a1f] bg-[#fdf4de] px-3 py-2 text-[12.5px] font-bold text-[#a6791f]"
                  >
                    <MaterialIcon name="undo" className="text-[15px]" />
                    Kembalikan ke Technical Analyst untuk Revisi
                  </button>
                </div>
              ) : !ready ? (
                <div className="rounded-lg bg-[#faf1de] px-3 py-2 text-[12px] text-[#a6791f]">
                  {technical.pmReviewNote ? `Revisi diminta — menunggu Technical Analyst submit ulang. Catatan: ${technical.pmReviewNote}` : "Menunggu Technical Analyst mensubmit laporan."}
                </div>
              ) : (
                <>
                  <div className={`grid gap-2 ${reopen ? "grid-cols-1" : "grid-cols-3"}`}>
                    {(reopen ? (["REVISION"] as Decision[]) : (["APPROVED", "REVISION", "REJECTED"] as Decision[])).map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={saving}
                        onClick={() => setDecision(d)}
                        className={
                          "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-bold disabled:opacity-50 " +
                          (decision === d ? DECISION_UI[d].on : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
                        }
                      >
                        <MaterialIcon name={DECISION_UI[d].icon} className="text-[15px]" />
                        {DECISION_UI[d].label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={decision === "REJECTED" ? "Alasan penolakan (wajib)..." : decision === "REVISION" ? "Catatan revisi untuk Technical Analyst (wajib)..." : "Catatan (opsional)..."}
                    disabled={saving}
                    className="mt-3 w-full resize-none rounded-lg border border-[#e8dccd] bg-[#faf7f4] p-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f2ece5]"
                  />
                  {decision === "REVISION" ? (
                    <p className="mt-2 text-[11px] text-[#8a7565]">
                      Analisis dibuka kembali untuk Technical Analyst; setelah diperbaiki dan disubmit ulang, laporan kembali menunggu review Anda.
                    </p>
                  ) : (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-[11.5px] font-bold text-[#20180f]" htmlFor="pm-technical-review-date">
                        Tanggal Review
                      </label>
                      <input
                        id="pm-technical-review-date"
                        type="date"
                        value={reviewedAt}
                        max={assignmentDateKey(new Date())}
                        onChange={(e) => setReviewedAt(e.target.value)}
                        disabled={saving}
                        className="w-full rounded-lg border border-[#e8dccd] bg-[#faf7f4] px-2.5 py-2 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f2ece5]"
                      />
                      <p className="mt-1 text-[10.5px] text-[#8a7565]">Tanggal ini tercetak sebagai TANGGAL TERBIT pada sampul laporan bila disetujui.</p>
                    </div>
                  )}
                  <label className="mt-3 flex items-start gap-2 text-[11.5px] text-[#20180f]">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={saving} className="mt-0.5" />
                    <span>Saya sudah mereview Laporan Analisis Teknis ini.</span>
                  </label>
                  <button
                    type="button"
                    disabled={saving || !decision || !confirmed || !reviewedAt || (decision !== "APPROVED" && !note.trim())}
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
              title="Laporan Analisis Teknis"
              src={`/project-manager-workspace/assignments/${technical.assignmentNumber}/technical-report`}
              className="size-full min-h-[70vh] border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <MaterialIcon name={icon} className="mt-0.5 text-[16px] text-[#e0662e]" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-[#a68f80]">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
