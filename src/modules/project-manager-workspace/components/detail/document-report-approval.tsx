"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { MaterialIcon } from "../material-icon";
import { Button } from "@/components/ui/button";
import { PmDocumentReportReviewModal } from "./pm-document-report-review-modal";
import { formatAssignmentDate } from "@/lib/assignment-date";
import {
  DOCUMENT_REPORT_REVIEW_DECISION_BADGE,
  DOCUMENT_REPORT_REVIEW_DECISION_LABELS,
} from "@/modules/technical-analyst-workspace/document-report-review";
import type { PmApplicationDetail } from "./types";

/**
 * PM's review + approval of the Laporan Verifikasi Dokumen, right where the report is opened
 * (Documents → Document Report). Same `laporanVerifikasi` approval the Approval Center uses
 * (pmReviewStatus on the dokumen assignment), so both places stay in sync. The Technical Analyst's
 * own review is shown as context; it does not block the PM.
 */
export function DocumentReportApproval({ data, applicationNumber }: { data: PmApplicationDetail; applicationNumber: string }) {
  const queryClient = useQueryClient();
  const dokumen = data.assignments.dokumen;
  const taReview = data.assignments.technical?.documentReportReview ?? null;
  // null = closed; "VIEW" = open with no decision preselected (already decided / just reviewing).
  const [dialog, setDialog] = useState<"APPROVED" | "REJECTED" | "REVISION" | "VIEW" | null>(null);

  if (!dokumen) return null;
  const ready = dokumen.status === "COMPLETED";
  const pmStatus = dokumen.pmReviewStatus as "APPROVED" | "REJECTED" | null;
  // PM "Kembalikan untuk Revisi": note kept, no status, while the verifikator reworks the report.
  const revisionRequested = !pmStatus && !ready && Boolean(dokumen.pmReviewNote);

  function refresh() {
    setDialog(null);
    queryClient.invalidateQueries({ queryKey: ["project-manager-workspace", "applications", data.verificationType, applicationNumber] });
    queryClient.invalidateQueries({ queryKey: ["project-manager-workspace", "dashboard"] });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-4">
        <div className="mb-3 text-[13.5px] font-extrabold text-[#20180f]">Review & Persetujuan Laporan</div>

        <div className="flex flex-col gap-2.5 text-[12.5px] text-[#4a4038]">
          <Row icon="person" label="Verifikator">
            {ready ? (
              <>
                Disubmit {formatAssignmentDate(dokumen.validatedAt)}
                {dokumen.verifikatorName ? ` oleh ${dokumen.verifikatorName}` : ""}
              </>
            ) : (
              <span className="text-[#a68f80]">Belum disubmit verifikator</span>
            )}
          </Row>

          <Row icon="fact_check" label="Review Technical Analyst">
            {taReview?.decision ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${DOCUMENT_REPORT_REVIEW_DECISION_BADGE[taReview.decision]}`}>
                  {DOCUMENT_REPORT_REVIEW_DECISION_LABELS[taReview.decision]}
                </span>
                <span>
                  {formatAssignmentDate(taReview.verifiedAt)}
                  {taReview.verifiedByName ? ` · ${taReview.verifiedByName}` : ""}
                </span>
                {taReview.note && <span className="w-full text-[#6b5b4c]">Catatan: {taReview.note}</span>}
              </span>
            ) : (
              <span className="text-[#a68f80]">Belum direview Technical Analyst</span>
            )}
          </Row>

          <Row icon="verified" label="Persetujuan PM">
            {pmStatus ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    pmStatus === "APPROVED" ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#fbe4de] text-[#c1361f]"
                  }`}
                >
                  {pmStatus === "APPROVED" ? "Disetujui" : "Ditolak"}
                </span>
                <span>{formatAssignmentDate(dokumen.pmReviewedAt)}</span>
                {dokumen.pmReviewNote && <span className="w-full text-[#6b5b4c]">Catatan: {dokumen.pmReviewNote}</span>}
              </span>
            ) : revisionRequested ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[#fdf4de] px-2.5 py-0.5 text-[11px] font-bold text-[#a6791f]">Revisi diminta</span>
                <span>{formatAssignmentDate(dokumen.pmReviewedAt)} · menunggu verifikator submit ulang</span>
                <span className="w-full text-[#6b5b4c]">Catatan: {dokumen.pmReviewNote}</span>
              </span>
            ) : (
              <span className="text-[#a68f80]">Belum diputuskan</span>
            )}
          </Row>
        </div>

        {ready && !pmStatus && taReview?.decision !== "VERIFIED" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#faf1de] px-3 py-2 text-[12px] text-[#a6791f]">
            <MaterialIcon name="info" className="mt-0.5 text-[15px]" />
            {taReview?.decision
              ? `Technical Analyst menandai laporan ini ${DOCUMENT_REPORT_REVIEW_DECISION_LABELS[taReview.decision]} — periksa catatannya sebelum menyetujui.`
              : "Technical Analyst belum mereview laporan ini."}
          </div>
        )}

        {pmStatus && (
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button type="button" variant="outline" onClick={() => setDialog("VIEW")} className="border-[#e1bfb3]">
              <MaterialIcon name="visibility" className="text-[16px]" />
              Lihat Review
            </Button>
            <Button type="button" variant="outline" onClick={() => setDialog("REVISION")} className="border-[#c98a1f] text-[#a6791f]">
              <MaterialIcon name="undo" className="text-[16px]" />
              Kembalikan untuk Revisi
            </Button>
          </div>
        )}

        {!pmStatus && (
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              type="button"
              disabled={!ready}
              onClick={() => setDialog("APPROVED")}
              className="bg-[#16a34a] text-white hover:bg-[#13843d]"
            >
              <MaterialIcon name="task_alt" className="text-[16px]" />
              {ready ? "Review & Approve Laporan" : "Menunggu Laporan Disubmit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!ready}
              onClick={() => setDialog("REJECTED")}
              className="border-[#e1bfb3] text-[#c1361f]"
            >
              <MaterialIcon name="cancel" className="text-[16px]" />
              Tolak
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!ready}
              onClick={() => setDialog("REVISION")}
              className="border-[#c98a1f] text-[#a6791f]"
            >
              <MaterialIcon name="undo" className="text-[16px]" />
              Revisi
            </Button>
          </div>
        )}
      </div>

      {dialog && (
        <PmDocumentReportReviewModal
          data={data}
          initialDecision={dialog === "VIEW" ? null : dialog}
          onClose={() => setDialog(null)}
          onDone={refresh}
        />
      )}
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
